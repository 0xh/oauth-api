'use strict';

class Encryption {
  constructor(kms) {
    this.kms = kms;
    this.keyId = process.env.AWS_KMS_KEY_ID;
  }

  encrypt(plainText) {
    return this.kms.encrypt({
      KeyId: this.keyId,
      Plaintext: plainText,
    }).promise().then(res => res.CiphertextBlob.toString('base64'));
  }

  decrypt(encryptedText) {
    return this.kms.decrypt({
      CiphertextBlob: Buffer.from(encryptedText, 'base64'),
    }).promise().then(res => res.Plaintext.toString('ascii'));
  }
}
export default Encryption;
