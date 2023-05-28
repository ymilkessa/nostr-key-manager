# Custom Key Pair Generator

This is a command line interface for generating, encrypting and saving a key pair that can be used for Nostr.

## How to use

#### Prerequisites:

- Node js and npm, typescript

#### Starting the CLI:

- Clone this repo. Open a terminal inside the repo's root directory.
- Run `npm run build`
- Run `npm start`
  This will prompt you to type in one of four letters: `n`, `f`, `q` and `h`.
  Enter `h` to see what each option does.

#### Generating a key pair

1. Enter `n` in the CLI prompt.
2. Come up with a name for your key pair (e.g. "My Nostr key 1"). Enter this name as the "heading".
   Note that you cannot save more than one key pair under the same heading.
3. Provide a password which will be used for encrypting the private key.

That's it. A new key pair should be saved in the file under the provided heading. The private
and public keys will be printed in the console as hex strings.

#### Fetching a saved file

1. Enter `f` in the CLI prompt.
2. Enter the heading for the key that you are looking for.
3. Provide the password.

Your private key should be printed in the console (along with the associated public key).
