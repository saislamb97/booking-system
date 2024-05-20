import { Router } from 'express';

const router = Router();

router.get("/", function (req, res, next) {
  const sess = req.session;
  if (sess.user) {
    // Send a simple message when the user is logged in
    res.send("Welcome back! You are logged in.");
  } else {
    // Send a message directing the user to log in
    res.send("Please log in to continue.");
  }
});
export default router;
