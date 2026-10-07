# Zona DNS pública de imtexsl.com (07/10/2026)

Foto de los registros que se ven desde fuera, consultados al servidor de nombres `ns110236.phdns6.es`. No es la zona completa: sin acceso al panel no se pueden listar los registros que no se conocen por su nombre. Sirve para recrearla igual en unos DNS nuevos sin que se caiga el correo.

## Dónde está cada cosa

- **Dominio:** registrador Name SRS AB (del mismo grupo que Profesional Hosting). Registrado el 05/09/2005, caduca el 05/09/2027, estado `active` (sin bloqueo de transferencia). Titular oculto en la consulta pública.
- **DNS y correo:** el servidor de 9Technology, 185.68.110.236. Es una máquina alquilada a Profesional Hosting, con cPanel. Allí están también su propia web (9tecnology.es) y las de otros clientes, y el certificado del correo es suyo (`imtexsl.com.9tecnology.es`). Los servidores de nombres `ns110236` y `dns110236.phdns6.es` son esa misma máquina.
- **Web actual (Joomla):** 185.177.153.45, otra IP de Profesional Hosting.
- **Correo:** IMAP 993/143, POP 995/110, SMTP 465/587/25, todos abiertos en `mail.imtexsl.com`.

## Registros

| Nombre | Tipo | TTL | Valor |
|---|---|---|---|
| imtexsl.com | NS | 86400 | ns110236.phdns6.es |
| imtexsl.com | NS | 86400 | dns110236.phdns6.es |
| imtexsl.com | A | 14400 | 185.177.153.45 |
| imtexsl.com | MX | 14400 | 10 mail.imtexsl.com |
| imtexsl.com | TXT | 14400 | v=spf1 a mx ip4:185.68.110.236 include:spf.profesionalhosting.com -all |
| www.imtexsl.com | CNAME | 14400 | imtexsl.com |
| ftp.imtexsl.com | CNAME | 14400 | imtexsl.com |
| mail.imtexsl.com | A | 14400 | 185.68.110.236 |
| webmail.imtexsl.com | A | 14400 | 185.68.110.236 |
| cpanel.imtexsl.com | A | 14400 | 185.68.110.236 |
| default._domainkey.imtexsl.com | TXT | 14400 | clave DKIM, copiada abajo |

Clave DKIM (`default._domainkey`), necesaria mientras el correo salga del servidor actual:

```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApfyZJKvgJQkQA2Mb+ApZ8A+B7kyJ0iFzmdnCetWIs+IX5hFFcfK1YtG5MptnutfErGq0Cc4Hy/QMd+sUpFpLSfkcRFC5wxCEPCpN+ihvQw4I4WfIZb/QWOqS3eDrHqy6Xf8QfP6N4wAlNg9MXLgIBJF++fS7SlYqd/sbMHR5YlgIifjLpDOA8q/ugXJFMVyONOwFhGu/e3FgwYJuKLO50oK69zbdUrwi4GLrYir8i/jbDAnVzcsLu9bJSNkOHLdrLl5Hjo2zO3cQx8tSEdsEBtsVq2Qed0wJ+Qvh808boeqiWIFQhBuAHp0QXB9rKCzR942H2BXbPnCHXP6prsKhwQIDAQAB;
```

No hay `_dmarc`, `autodiscover` ni `autoconfig`. SOA: `ns110236.phdns6.es`, serie 2026090903.

## Cómo se usaría

1. Con el dominio en una cuenta de IMTEX, se crea la zona en unos DNS nuevos con **todos** estos registros tal cual (MX, `mail`, `webmail`, SPF y DKIM apuntando al servidor actual), y solo entonces se cambian los servidores de nombres. El correo sigue llegando al servidor de 9Technology mientras exista.
2. La web nueva: se cambian `imtexsl.com` (A) y `www` (CNAME) a Netlify.
3. El correo: se crean los mismos buzones en un servicio a nombre de IMTEX, se copian los correos por IMAP y se cambian el MX, el SPF y el DKIM a los del servicio nuevo.
