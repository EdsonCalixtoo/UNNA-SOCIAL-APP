const crypto = require('crypto');

function getAppHash(packageName, signature) {
    const rawSignature = Buffer.from(signature.replace(/:/g, ''), 'hex');
    const data = Buffer.concat([
        Buffer.from(packageName, 'utf8'),
        Buffer.from(' ', 'utf8'),
        rawSignature
    ]);
    
    const hash = crypto.createHash('sha256').update(data).digest();
    const base64 = hash.toString('base64');
    return base64.substring(0, 11);
}

const packageName = 'com.bolt.starter';
const sha256 = 'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C';

console.log('App Hash:', getAppHash(packageName, sha256));
