//Author: Cleveland Plonsey
//Purpose: defines a middleware function that sanitizes user input
//Date: 11/9/2023

const { validationResult, body } = require("express-validator");

//sanitize the input from the user. This prevents Cross-site scripting (XSS)
//and SQL injection attacks
//add this middleware to any route that accepts user input and interacts with the db
const sanitizeMiddleware = [
  body("*").escape(), //escape html tags... prevent Cross-site scripting (XSS) in all fields in the req body
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      //errors were found in the input
      console.log("errors found in input: " + JSON.stringify(errors));
      return res.status(400).send("Invalid input"); //TODO: change this to redirect to an error page
    }
    //if we make it here, the input is sanitized and we can continue
    next();
  },
];

module.exports = sanitizeMiddleware;
