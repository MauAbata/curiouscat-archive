const https = require('https')
const express = require('express')
const app = express()

const IP_ADDR = [
  'curiouscat.me',
  '172.67.75.111',
  '104.26.9.190',
  '104.26.8.190',
]

function get_posts(username, max_timestamp) {
  const url = new URL("https://curiouscat.qa/api/v2.1/profile")
  url.searchParams.append("_ob", "noregisterOrSignin2")
  url.searchParams.append("username", username)

  if (typeof max_timestamp !== "undefined") {
    url.searchParams.append("max_timestamp", max_timestamp)
  }

  const path = url.pathname + "?" + url.searchParams.toString()
  console.log("GET " + path)

  return new Promise((resolve, reject) => {
    https.get({
      host: IP_ADDR[0],
      path: path,
      headers: {
        'Host': 'curiouscat.qa',
      }
    }, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        resolve(JSON.parse(data));
      })
    }).on("error", (err) => {
      reject("Oopsie fucking daisy, mate! " + err.message);
    })
  })
}

async function archive_user(username) {
  let max_timestamp = undefined
  let user_posts = []
  let posts = []

  do {
    posts = (await get_posts(username, max_timestamp)).posts
    console.log(posts.length)
    posts.forEach(({type, post}) => {
      if (type === 'post' && post) {
        let {id, likes, timestamp, comment, reply} = post
        // This minus 1 is written in blood.
        max_timestamp = timestamp - 1

        user_posts.push({
          id, likes, timestamp, comment, reply
        })
      }
    })
  } while (posts.length > 0)

  return user_posts
}

const render = (body) => `
<!doctype html>
<html>
<head>
    <title>Curious-ity Killed the Cat</title>
    <!-- Compiled and minified CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
    <!-- Compiled and minified JavaScript -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
    <!--Let browser know website is optimized for mobile-->
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style type="text/css">
        input {
            font: inherit !important;
            height: auto !important;
            line-height: 1.5rem !important;
            padding-bottom: 2rem !important;
        }
    </style>
    <script>
        function gofish(e) {
          e.preventDefault();
          const data = new FormData(e.target);
          const props = Object.fromEntries(data);
          
          window.location = "/" + props.username
        }
    </script>
</head>
<body>
  <div class="container">
      ${body}
  </div>
</body>
</html>`

app.get('/favicon.ico', (req, res) => {
  res.send("")
})

app.get('/', (req, res) => {
  res.send(render(`
    <h1>Whomst Do You Ask For?</h1>
    <form id="searchform">
        <h1><input type="text" name="username" autofocus id="username" placeholder="Username" /></h1>
        <button class="btn btn-large right" type="submit">Let's search...</button>
    </form>  
    <script>document.getElementById('searchform').onsubmit = gofish;</script>
  `));
})

app.get('/:username', (req, res) => {
  archive_user(req.params.username).then((posts) => {
    let output = ""

    posts.forEach(({id, likes, timestamp, comment, reply}) => {
      const date = new Date(timestamp * 1000)

      output += `
        <div class="right grey-text">${date.toLocaleString()}</div>
        <div><em>Question:</em></div>
        <blockquote>${comment.split("\n").join("<br />")}</blockquote>
        <div><em>Answer:</em></div>
        <p>${reply}</p>
        <hr />
        <br />
      `
    })

    res.send(render(`
      <p class="grey-text center">
        This archive tool was hastily coded by <a href="https://twitter.com/mauabata" target="_blank">@MauAbata</a>. 
        If it was useful, maybe offer them some <a href="https://ko-fi.com/Refsheet" target="_blank">Kofi</a>?
      </p>
      <h1 style="font-size: 2rem; text-align: center; margin-bottom: 3rem;">${req.params.username} was asked ${posts.length} questions:</h1>  
      ${output}
    `))
  })
    .catch(err => res.send(render(err)))
})

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("We're in.")
})