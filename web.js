var path = require('path')
  , express = require('express')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy;

// Set up MongoDB
var mongoUri = process.env.MONGOLAB_URI
            || process.env.MONGOHQ_URL
            || 'mongodb://localhost/test';
mongoose.connect(mongoUri);
var db = mongoose.connection;
var Bookmark, User;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  var bookmarkSchema = new mongoose.Schema({
    title: {
      type: String,
      default: "Saved bookmark"
    },
    description: {
      type: String,
      default: ""
    },
    link: String,
    date_added: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  });
  Bookmark = mongoose.model('Bookmark', bookmarkSchema);

  var userSchema = new mongoose.Schema({
    name: String,
    twitterId: String,
    bookmarks: [bookmarkSchema]
  });
  userSchema.statics.findOrCreate = function (profile, callback) {
    this.findOne({ twitterId: profile.id }, function (err, user) {
      if (err) {
        callback(err);
      }
      else if (user === null) {
        var user = new User({
          name: profile.displayName,
          twitterId: profile.id,
          bookmarks: []
        });
        user.save(callback);
      } else {
        callback(null, user);
      }
    });
  };
  userSchema.methods.addBookmark = function (bookmarkData, callback) {
    var bookmark = new Bookmark(bookmarkData);
    var user = this;
    bookmark.save(function (err, bookmark) {
      if (err) {
        callback(err);
      } else {
        user.bookmarks.push(bookmark);
        user.save(callback);
      }
    });
  }
  userSchema.methods.deleteBookmark = function (bookmarkId, callback) {
    User.update({ _id: this.id },
      { $pull: { bookmarks: { _id: bookmarkId } } }, function (err) {
        if (err)
          callback(err);
        Bookmark.remove({ _id: bookmarkId }, callback);
      });
  }
  User = mongoose.model('User', userSchema);

  console.log('Connected to database.');
});

// Set up Express
var app = express();
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(path.join(__dirname, 'views')));
  app.set('port', process.env.PORT || 5000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.cookieSession({
    secret: process.env.SECRET_KEY,
    maxAge: 3600000
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

// Set up Twitter login
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: (process.env.SITE_URL || "http://localhost:5000")
               + "/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    User.findOrCreate(profile, function(err, user) {
      if (err) {
        return done(err);
      }
      done(null, user);
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/bookmarks', function(req, res) {
  if (!('user' in req))
    res.redirect('/auth/twitter');
  res.render('bookmarks', {
    name: req.user.name,
    bookmarks: req.user.bookmarks
  });
});

app.post('/bookmarks/add', function(req, res) {
  console.log(req.body);
  req.user.addBookmark(req.body, function (err, user) {
    if (err)
      console.error(err);
    res.redirect('/bookmarks');
  });
});

app.post('/bookmarks/:bookmarkId/delete', function(req, res) {
  req.user.deleteBookmark(req.params.bookmarkId, function (err) {
    if (err)
      console.error(err);
    res.redirect('/bookmarks');
  });
});

// Redirect the user to Twitter for authentication.  When complete, Twitter
// will redirect the user back to the application at
//   /auth/twitter/callback
app.get('/auth/twitter', passport.authenticate('twitter'));

// Twitter will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { successRedirect: '/bookmarks',
                                     failureRedirect: '/auth/twitter' }));

app.listen(app.get('port'), function() {
  console.log('Listening on ' + app.get('port'));
});