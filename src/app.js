require('dotenv').config();
const fs = require('fs');

const url = 'http://www.elnautico.org/?page_id=176';
const selectorGrupos = 'h1 + ol li a';
const palabrasClave = ['Ferreiro', 'Leiva', 'morgan'];

const CronJob = require('cron').CronJob;
const job = new CronJob({
    cronTime: '*/1 * * * *',
    onTick: function() {
        const cheerioReq = require('cheerio-req');
        cheerioReq(url, (err, $) => {
            const grupos = getGrupos($);
            if (grupos.length > 0) {
                sendEmail(grupos);
            }
        });
    },
    start: false,
    timeZone: 'Europe/Madrid'
});
job.start();

const getGrupos = function($) {
    let grupos = [];
    $(selectorGrupos).each((index, el) => {
        const groupData = $(el).text().split('–');
        grupos.push({
            nombre: groupData[0].trim(),
            fecha: groupData[1].trim()
        });
    });
    console.log('Grupos con entradas', grupos);
    let gruposEnviados = [];
    if (fs.existsSync('data')) {
        gruposEnviados = JSON.parse(fs.readFileSync('data').toString());
    }
    console.log('Ya enviado a', gruposEnviados);
    grupos = grupos.filter(
        grupo => palabrasClave.some(
            clave => grupo.nombre.toLowerCase().indexOf(clave.toLowerCase()) !== -1
            && gruposEnviados.find(ge => ge.nombre === grupo.nombre && ge.fecha === grupo.fecha) === undefined
        )
    );
    console.log('Envío a', grupos);
    return grupos;
};

const sendEmail = function(grupos) {
    const nodemailer = require('nodemailer');
    let transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: process.env.MAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
        }
    });
    let text = '';
    let html = '<ul>';
    grupos.forEach(grupo => {
        text += `
- ${grupo.nombre} toca el ${grupo.fecha}
`;
        html += `<li>${grupo.nombre} toca el ${grupo.fecha}</li>`
    });
    html += '</ul>';
    let mailOptions = {
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        subject: 'Nuevas entradas en El Naútico',
        text: 'Tienes nuevas entradas: ' + text,
        html: '<strong>Tienes nuevas entradas para El Naútico:</strong>' + html
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        fs.writeFile("./data", JSON.stringify(grupos), function(err) {
            if (err) {
                return console.log(err);
            }

            console.log('Data saved', grupos);
        });
    });
};
