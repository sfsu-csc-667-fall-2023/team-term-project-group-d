const { validationResult, body } = require("express-validator");

/**
 * sanitize the input from the user. This prevents Cross-site scripting (XSS)
 * and SQL injection attacks
 * add this middleware to any route that accepts user input and interacts with the db
 */
const sanitizeMiddleware = [
  body("*").escape(), //escape html tags... prevent Cross-site scripting (XSS) in all fields in the req body
  (req, res, next) => {
    const errors = validationResult(req);

    // TODO : determine which error it is, then send it back into the message
    if (!errors.isEmpty()) {
      console.error("errors found in input: " + JSON.stringify(errors));

      req.session.errors =
        "MySQL or HTML is injected or Email is of incorrect form";
      return res.redirect("/register");
    }

    next();
  },
];

module.exports = sanitizeMiddleware;
