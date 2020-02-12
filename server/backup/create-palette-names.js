var fs = require('fs');
fs.readFile('game.json', (err, text) => {
  json = JSON.parse(text);
  for (var i = 0; i < 32; i++) {
    json.pals[`palette-${i}`] = {"y":i,"w":16,"h":1,"x":0};
  }
  console.log(JSON.stringify(json));
});
