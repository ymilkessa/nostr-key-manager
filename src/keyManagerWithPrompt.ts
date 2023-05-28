import { privateKeyVerify, publicKeyCreate } from "secp256k1";
import Cryptr from "cryptr";
import prompt from "prompt";
const { randomBytes } = require("crypto");
const path = require("path");
const fs = require("fs");

import { KEY_FILE_NAME, ENCRYPTION_TAG, SEPARATOR } from "./constants";

const saveEncryptedKey = (encryptedKey: string, heading: string) => {
  const keysDir = path.join(__dirname, "../keys");
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
  }
  const keyFile = path.join(keysDir, KEY_FILE_NAME);
  const keySegmentToWrite = heading + ":\n" + encryptedKey + "\n";
  fs.appendFileSync(keyFile, keySegmentToWrite);
};

/**
 * Get a list of all the headings used to save keys in the keys file.
 */
const getHeadings = () => {
  const keysDir = path.join(__dirname, "../keys");
  const keyFile = path.join(keysDir, KEY_FILE_NAME);
  const keysAndHeadings = fs.readFileSync(keyFile, "utf8").split("\n");
  const headings = keysAndHeadings.filter((line: string) => {
    return line.endsWith(":");
  });
  return headings.map((heading: string) => {
    return heading.slice(0, heading.length - 1);
  });
};

/**
 * Fetch the encrypted string that occurs after the given heading in the keys file.
 */
const fetchEncryptedKey = (heading: string) => {
  const keysDir = path.join(__dirname, "../keys");
  if (!fs.existsSync(keysDir)) {
    return undefined;
  }
  const keyFile = path.join(keysDir, KEY_FILE_NAME);
  if (!fs.existsSync(keyFile)) {
    return undefined;
  }
  const keysAndHeadings = fs.readFileSync(keyFile, "utf8").split("\n");

  // Find the index of the line that starts with the given heading and a ":".
  const headingIndex = keysAndHeadings.findIndex((line: string) => {
    return line.startsWith(heading + ":");
  });
  if (headingIndex === -1) {
    return undefined;
  }
  return keysAndHeadings[headingIndex + 1];
};

const generateKeys = (): string => {
  let privKey;
  do {
    privKey = randomBytes(32);
  } while (!privateKeyVerify(privKey));

  return privKey.toString("hex");
};

const makeAndSaveKeys = () => {
  const scheme = {
    properties: {
      heading: {
        description: "Enter a heading to save the keys under",
        pattern: /^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/,
        message:
          "Heading must be at least 1 character long. And must only contain alphanumeric characters and single spaces. It cannot start or end with a space.",
        required: true,
      },
      password: {
        description: "Enter password",
        pattern: /^.{8,}$/,
        message: "Password must be at least 8 characters long.",
        hidden: true,
        required: true,
      },
      passwordConfirmation: {
        description: "Confirm password",
        pattern: /^.{8,}$/,
        message: "Password must be at least 8 characters long.",
        hidden: true,
        required: true,
      },
    },
  };

  let privKey = "";
  prompt.start();
  prompt.get(scheme, (err: any, result: any) => {
    if (err) {
      console.log(err);
      return;
    }
    if (result.password !== result.passwordConfirmation) {
      console.log("Passwords do not match. Must redo the process.");
      return;
    }

    const prevHeadings = getHeadings();
    if (prevHeadings.includes(result.heading)) {
      console.log(
        `Heading ${result.heading} already exists. Must enter a new heading or delete the old one.`
      );
      // Re-run the prompt.
      return makeAndSaveKeys();
    }

    privKey = generateKeys();
    const pubKey = publicKeyCreate(Buffer.from(privKey, "hex"));
    const pubKeyRawString = pubKey.toString();
    const byteHexValues = pubKeyRawString.split(",").map((byte: string) => {
      const byteNum = parseInt(byte);
      return byteNum.toString(16);
    });
    const pubKeyHexString = byteHexValues.join("");
    console.log(
      "You've created a key pair with the public key: " + pubKeyHexString
    );

    const crypter = new Cryptr(result.password);
    const encryptedPrivKey = crypter.encrypt(
      ENCRYPTION_TAG + SEPARATOR + privKey
    );
    saveEncryptedKey(encryptedPrivKey, result.heading);

    // Debugging logs...
    console.log(
      "The private key is encrypted and saved under the heading: " +
        result.heading
    );
    console.log("The private key is: " + privKey);
    console.log("Your password is: " + result.password);
  });
};

const getKeys = () => {
  const scheme = {
    properties: {
      heading: {
        description: "Enter the heading of the key that you want to retrieve",
        pattern: /^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/,
        message:
          "Heading must be at least 1 character long. And must only contain alphanumeric characters and single spaces. It cannot start or end with a space.",
        required: true,
      },
      password: {
        description: "Enter password",
        pattern: /^.{8,}$/,
        message: "Password is at least 8 characters long.",
        hidden: true,
        required: true,
      },
    },
  };

  prompt.start();
  prompt.get(scheme, (err: any, result: any) => {
    if (err) {
      console.log(err);
      return;
    }
    const encryptedKey = fetchEncryptedKey(result.heading);
    if (!encryptedKey) {
      console.log("Heading does not exist.");
      return;
    }
    const crypter = new Cryptr(result.password);
    const decryptedKey = crypter.decrypt(encryptedKey);
    if (!decryptedKey.startsWith(ENCRYPTION_TAG)) {
      console.log("Password is incorrect.");
      return;
    }
    const privKey = decryptedKey.split(SEPARATOR)[1];
    const pubKey = publicKeyCreate(Buffer.from(privKey, "hex"));
    // convert pubkey into a hex string.
    const pubKeyRawString = pubKey.toString();
    const byteHexValues = pubKeyRawString.split(",").map((byte: string) => {
      const byteNum = parseInt(byte);
      return byteNum.toString(16);
    });
    const pubKeyHexString = byteHexValues.join("");

    console.log("The public key is: " + pubKeyHexString);
    console.log("The private key is: " + privKey);
  });
};

/**
 * This function runs this following interface on a loop:
 * This offers the user three options in the console:
 * 1. n for "new keys": generating a new key pair and saving the encrypted keys under a heading.
 * 2. f for "fetch keys": fetching the encrypted keys under a heading and decrypting them.
 * 3. q for "quit": quitting the program.
 * 4. h for "help": showing the help menu.
 *
 * All query inputs should simply be strings that are at least 1 character long when trimmed.
 */
export const runKeyManager = () => {
  const scheme = {
    properties: {
      option: {
        description: "Enter an option",
        pattern: /^[nfqhNFQH]$/,
        message: "Option must be one of the following: n, f, q, h.",
        required: true,
      },
    },
  };
  prompt.start();
  prompt.get(scheme, (err: any, result: any) => {
    if (err) {
      console.log(err);
      return;
    }
    const resultFirstChar = result.option[0].toLowerCase();
    switch (resultFirstChar) {
      case "n":
        return makeAndSaveKeys();
      case "f":
        return getKeys();
      case "q":
        return;
      case "h":
        let helpMessage = "";
        helpMessage += "List of options: \n";
        helpMessage +=
          "n for 'new keys': generating a new key pair and saving the encrypted keys under a heading. \n";
        helpMessage +=
          "f for 'fetch keys': fetching the encrypted keys under a heading and decrypting them. \n";
        helpMessage += "q for 'quit': quitting the program. \n";
        helpMessage += "h for 'help': showing the help menu. \n";
        console.log(helpMessage);
        return runKeyManager();
      default:
        console.log("Invalid input. Enter 'h' for help.");
        return runKeyManager();
    }
  });
};
