(function () {
  var u, d, t;
  u = location.href;
  if (document.getSelection) {
    d = document.getSelection();
  } else {
    d = '';
  };
  t = document.title;
  void(open('http://localhost:5000/bookmarks/add?bookmark_url='
     + encodeURIComponent(u)
     + '&description=' + encodeURIComponent(d)
     + '&title=' + encodeURIComponent(t),
     'For Later',
     'toolbar=no,width=250,height=40')
  );
})();