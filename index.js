//import module whatsapp web, qrcode terminal, csv-parser
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const csv = require('csv-parser');
const fs = require('fs');
const random = require('random')
const createCsvWriter = require('csv-writer').createArrayCsvWriter;
const csvWriter = createCsvWriter({
    header: ['NO', 'KONTAK'],
    path: 'kontak.csv'
});

//pengecekan session whatsapp web
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

//men-generate qr code web whatsapp di terminal
const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });
client.initialize();

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
	//kirim pesan ke semua nomer yang berada di file kontak.csv
	if (msg.body.startsWith('!sendto ')) {
			const results = [];
			function r(results) {
				//membaca kontak dari file csv dan memasukannya ke dalam array
				fs.createReadStream('kontak.csv')
				  .pipe(csv({separator : ','}))
				  .on('data', (data) => results.push(data))
				  .on('end', () => {
					  console.log('Sukses Load');
				  });
				setTimeout (() => {
					// Direct send a new message to specific id
					let bagi = msg.body.split(' ')[1];
					let messageIndex = msg.body.indexOf(bagi);
					let message = msg.body.slice(messageIndex, msg.body.length);
					for (let i = 0;i < results.length; i++){
						number = results[i]['KONTAK'];
						number = number.includes('@c.us') ? number : `${number}@c.us`;
						client.sendMessage(number, message);
					}
				}, 1000);
				setTimeout (() => {
					client.sendMessage(msg.from, "Selesai mengirim ke "+results.length+" nomer!")
				}, 3000);
			}
			r(results);
	}
	else if (msg.body.startsWith('!cek ')) {
		let number = msg.body.split(' ')[1];
		number = number.includes('@c.us') ? number : `${number}@c.us`;
		client.isRegisteredUser(number).then(function(isRegistered) {
			if(isRegistered) {
				client.sendMessage(msg.from, "*"+number+"*");
			} else {
				client.sendMessage(msg.from, "~"+number+"~");
			}
		})
	}
	//mencari kontak nomer secara random dengan perulangan
	else if (msg.body.startsWith('!random ')) {
		let wadah = [];
		let provider = msg.body.split(' ')[1];
		let req = msg.body.split(' ')[2];
		let berhasil = 0;
		let gagal = 0;
		function r(provider, req, wadah) {
			for(let i=0;i < req;i++) {
				let akhir = random.int(10000000,99999999);
				let number = provider+akhir+'@c.us';
				client.isRegisteredUser(number).then(function(isRegistered) {
					if(isRegistered) {
						berhasil += 1;
						let data = [i, provider+akhir];
						wadah.push(data);
					} else {
						gagal += 1;
					}
				});
			}
			setTimeout(() => {
				csvWriter.writeRecords(wadah);
				client.sendMessage(msg.from, "Dari "+req+" perulangan, ditemukan "+berhasil+" nomer dan "+gagal+" gagal.");
			}, 3000);
		}
		r(provider, req, wadah);
	}
});
