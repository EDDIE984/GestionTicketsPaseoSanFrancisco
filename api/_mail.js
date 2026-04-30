import nodemailer from 'nodemailer';

export function buildMailTransport(config) {
  return nodemailer.createTransport({
    host: config.host_smtp,
    port: Number(config.puerto_smtp),
    secure: config.seguridad === 'ssl',
    auth: {
      user: config.usuario_smtp,
      pass: config.password_smtp,
    },
    requireTLS: config.seguridad === 'tls',
  });
}
