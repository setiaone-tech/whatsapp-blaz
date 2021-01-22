//import module whatsapp web, qrcode terminal, csv-parser
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const csv = require('csv-parser');
const results = [];
const fs = require('fs');

//membaca kontak dari file csv dan memasukannya ke dalam array
fs.createReadStream('kontak.csv')
  .pipe(csv({separator : ','}))
  .on('data', (data) => results.push(data))
  .on('end', () => {
	  console.log('Sukses Load');
  });

//pengecekan session whatsapp web
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

//men-generate qr code web whatsapp di terminal
const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });
client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
	qrcode.generate(qr, {small : true});
});

//menyimpan session pada file json
client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

//memberitahu apabila client telah siap
client.on('ready', () => {
    console.log('Client is ready!');
});

//fungsi whatsapp blast
client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
	if (msg.body.startsWith('!sendto ')) {
			// Direct send a new message to specific id
			let bagi = msg.body.split(' ')[1];
			let messageIndex = msg.body.indexOf(bagi);
			let message = msg.body.slice(messageIndex, msg.body.length);
			for (let i = 0;i < results.length; i++){
				number = results[i]['KONTAK'];
				number = number.includes('@c.us') ? number : `${number}@c.us`;
				let chat = await msg.getChat();
				chat.sendSeen();
				client.sendMessage(number, message);
			};
	}
});

client.initialize();