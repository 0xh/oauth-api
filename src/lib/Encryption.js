/**
 * Author: miro@keboola.com
 * Date: 29/11/2017
 */
'use strict';

class Encryption {
  constructor(awsKms) {
    this.kms = awsKms;
    this.keyId = process.env.AWS_KMS_KEY_ID;
  }

  encrypt(plainText) {
    return this.kms.encrypt({
      KeyId: this.keyId,
      Plaintext: plainText
    });
  }

  decrypt(encryptedText) {

  }
}
export default Encryption;