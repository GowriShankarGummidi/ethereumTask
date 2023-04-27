const jwt = require('jsonwebtoken');
require('dotenv').config();
function authentication(req, res, next) {
    const authToken = req.headers['authorization'];
    const token = authToken && authToken.split(" ")[1];
    if(token ==  null) {
        return res.status(400).send('Token is Null');
    }
    jwt.verify(token, process.env.SECRET_KEY, (err, account) => {
        if(err) {
            return res.status(400).send("Token is Invalid");
        }
        req.user = account;
        next();
    })
}
module.exports = authentication;

