import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
	service: 'Gmail',
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: 'soporteundersounds@gmail.com',
		pass: process.env.MAIL_APP_PASSWORD,
	},
});
