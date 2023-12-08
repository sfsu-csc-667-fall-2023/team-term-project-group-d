const isAuthorized = (req, res, next) => {
  // If user session, we are logged in
  if (res.locals.user) next();
  else res.redirect("/login");
};

const notAuthorized = (req, res, next) => {
  // If no user session, we are logged out
  if (!res.locals.user) next();
  // TODO: Redirect user somewhere if they try to access Views only accessible for unauthorized users (/login, /register, etc)
  else res.send("User must be logged out");
  // res.redirect('/some-view');
};

module.exports = { isAuthorized, notAuthorized };
