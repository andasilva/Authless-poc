var express = require('express');
var router = express.Router();
const crypto = require('crypto');

const confirmCodes = {
    ACCEPTED: 1,
    DENIED: 0,
    PENDING: -1
}

const USER_ID = process.env.USER_ID || 'user-demo';
const DEVICE_ID = process.env.DEVICE_ID || 'device-demo';
const TOKEN_SURVIVAL_TIME = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_ACCEPTING_TIME = 60 * 1000; // 1 minute

router.get('/accept/:id', function (req, res) {
    let identification = getRequestIdentification(req);
    let reqId = req.params.id;
    db.prepare('UPDATE access SET confirmed=? WHERE id=? AND user_id = ? AND device_id = ?')
        .run(confirmCodes.ACCEPTED, reqId, identification.user_id, identification.device_id)
    res.json({
        code: "Maybe updated :)"
    })
});

router.get('/pending', function (req, res) {
    let identification = getRequestIdentification(req);
    let timeValidation = Date.now() + TOKEN_SURVIVAL_TIME - TOKEN_ACCEPTING_TIME;
    res.json(db.prepare("SELECT * FROM access WHERE confirmed = ? AND user_id = ? AND device_id = ? AND expires_on < ? ")
        .all(confirmCodes.PENDING, identification.user_id, identification.device_id, timeValidation));
})

router.all('*', function (req, res, next) {
    if (hasTokenValid(req))
        res.sendStatus(200);
    let id = storeAccessRequest(req);
    waitForValidation(req, res, id);
});

function getRequestIdentification(req) {
    return {
        user_id: req.body.user_id || 'unknown_user',
        device_id: req.body.device_id || 'unknown_device'
    }
}

function hasTokenValid(req) {
    console.log("Checking token valid");
    let token = req.header('Access-Token');
    let website = req.header('Host');
    return !!(token && getRequestAccessFor(website, token).token === token);
}


function storeAccessRequest(req) {
    console.log("Storing request access");
    let expireDate = Date.now() + TOKEN_SURVIVAL_TIME; // expire after 24h
    let token = crypto.randomBytes(256).toString('hex');
    let index = Date.now() + "-" + crypto.randomBytes(10).toString('hex');
    let host = req.header('Host');
    db.prepare('INSERT INTO access VALUES(?,?,?,?,?,?,?)')
        .run(index, host, USER_ID, DEVICE_ID, expireDate, confirmCodes.PENDING, token);
    return index;
}


function waitForValidation(req, res, id) {
    console.log("Waiting for validation");
    let _flagCheck = setInterval(function () {
        let validation = checkIfValidated(id)

        if (validation.confirmed === confirmCodes.ACCEPTED) {
            clearInterval(_flagCheck);
            res.set('Access-Token', validation.token);
            res.sendStatus(200);
        } else if (validation === confirmCodes.DENIED) {
            clearInterval(_flagCheck);
            res.sendStatus(401);
        }
    }, 1000);
}

function checkIfValidated(id) {
    console.log("Not validated for now...");
    let confirmation = db.prepare('SELECT confirmed, expires_on, token FROM access WHERE id=?').get(id);
    // Check if validated during the period of 1 minute after requested
    let timeValidation = Date.now() + TOKEN_SURVIVAL_TIME - TOKEN_ACCEPTING_TIME;
    if (confirmation.expires_on < timeValidation)
        return confirmCodes.DENIED;

    return confirmation;
}


function getRequestAccessFor(website, token) {
    return db.prepare('SELECT * FROM access WHERE expires_on < ? AND token = ? AND website = ?').get(Date.now(), token, website);
}


module.exports = router;
