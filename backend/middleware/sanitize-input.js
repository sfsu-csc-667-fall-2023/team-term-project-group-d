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

    if (!errors.isEmpty()) {
      console.error("errors found in input: " + JSON.stringify(errors));

      return res.render("register", {
        errors: "MySQL or HTML is injected or Email is of incorrect form",
      });
    }

    next();
  },
];

module.exports = sanitizeMiddleware;
