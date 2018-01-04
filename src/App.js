/* global web3 */
import React, { Component } from 'react';
import './App.css';

import NotaryStoreContract from 'ethereum-notary-contracts';
import contract from 'truffle-contract';

import ReactTable from 'react-table';
import 'react-table/react-table.css';

import Dropzone from 'react-dropzone';

let storeInstance;

function getInstance() {
  if (!web3) { alert('Network error. Use something like MetaMask to connect to the Ethereum network.'); }
  if (storeInstance) {
    return Promise.resolve(storeInstance);
  } else {
    return createStoreInstance().then(instance => {
      storeInstance = instance;
      return instance;
    });
  }
}

function createStoreInstance() {
  const storeContract = contract(NotaryStoreContract);
  storeContract.setProvider(web3.currentProvider);
  storeContract.defaults({ from: web3.eth.defaultAccount });

  return storeContract.deployed();
}

/**
 * @param {ArrayBuffer} buffer
 */
function sha256(buffer) {
  return crypto.subtle.digest("SHA-256", buffer).then(function (hash) {
    return hex(hash);
  });
}

function hex(buffer) {
  var hexCodes = [];
  var view = new DataView(buffer);
  for (var i = 0; i < view.byteLength; i += 4) {
    // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
    var value = view.getUint32(i)
    // toString(16) will give the hex representation of the number without padding
    var stringValue = value.toString(16)
    // We use concatenation and slice for padding
    var padding = '00000000'
    var paddedValue = (padding + stringValue).slice(-padding.length)
    hexCodes.push(paddedValue);
  }

  // Join all the hex strings into one
  return hexCodes.join("");
}


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      foundEntries: [],
      signer: '',
      documentHash: '',
      documentHashToUpload: ''
    };

    this.createEntry = this.createEntry.bind(this);
    this.findEntries = this.findEntries.bind(this);
    this.getSetter = this.getSetter.bind(this);
    this.onDrop = this.onDrop.bind(this);
  }

  createEntry() {
    if (!this.state.documentHashToUpload) { return; }
    return getInstance().then(instance => {
      return Promise.resolve(instance.create("0x" + this.state.documentHashToUpload, {from: web3.eth.defaultAccount, value: web3.toWei("1", "finney") })); // adding 0x because it is needed for Solidity to recognize the hash as byte32
    });
  }

  findEntries() {
    this.setState({ foundEntries: [] });

    getInstance().then(instance => {
      const filters = {};
      if (this.state.signer) {
        filters.signer = this.state.signer;
      }
      if (this.state.documentHash) {
        filters.documentHash = "0x" + this.state.documentHash;
      }

      let entryEvent;
      try {
        entryEvent = instance.Entry(filters, { fromBlock: 0, toBlock: 'latest' });
      } catch (e) {
        console.log(e);
        entryEvent = instance.Entry({}, { fromBlock: 0, toBlock: 'latest' });
      }

      entryEvent.watch((err, response) => {
        this.setState(prevState => {
          response.args.documentHash = response.args.documentHash.slice(2); // Knock off the 0x.
          prevState.foundEntries.push(response.args);
          return prevState;
        });
      });
    });
  }

  getSetter(property) {
    return event => {
      this.setState({ [property]: event.target.value });
    };
  }

  onDrop(files) {
    const file = files[0]; // Only take the first file.
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      sha256(buffer).then(hash => this.setState({ documentHashToUpload: hash }));
    };
    reader.onabort = () => console.log('file reading was aborted');
    reader.onerror = () => console.log('file reading has failed');

    reader.readAsArrayBuffer(file);

  }

  render() {

    const columns = [{
      Header: 'Signer\'s Address',
      accessor: 'signer' // String-based value accessors!
    }, {
      Header: 'Document Hash (SHA-256)',
      accessor: 'documentHash'
    }];

    let createHtml = null;
    if (this.state.documentHashToUpload) {
      createHtml = <div><p>Your Document's Hash: <b>{this.state.documentHashToUpload}</b></p><button onClick={this.createEntry}>Create Entry with Document Hash</button></div>;
    }

    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">EthNotary</h1>
          <p>Welcome to the Ethereum Notary Service!</p>
        </header>
        <p>
          This service provides a way to publicly verify signatures on a digital document without the need for a trusted outside party.
        </p>
        <p>
          Using the Ethereum blockchain, we can store a hash of a private document (a contract, for example) along with an Ethereum
          Address. This proves in a public and secure way that the owner of the Ethereum Address has signed the
          document. Other parties to the contract can sign it as well. All they need is a copy of the original digital document.
        </p>
        <p>The contents of the document remain a secret only known by those who possess the original digital document. This is possible
          because only the hash of the document is stored and not the document itself.
        </p>
        <p>
          The original document always generates the same hash. If there is ever a dispute over the details of the document,
          Anybody who possesses the original digital document can generate the hash and show that people have signed it by searching
          the blockchain for that hash and the accompanying Addresses.
        </p>
        <p>
          The hash is a cryptographic string that cannot be reverse-engineered. The hash can only be generated by providing the
          original digital document as a seed.
        </p>
        <Dropzone onDrop={this.onDrop} className="uploader">
          <p>Get started by dropping your document here or clicking here to select a document.</p>
        </Dropzone>
        <p><i>
          Note: Your hash will be generated locally right in your browser. Your document will not be uploaded to any servers. Your document will remain private to you.
        </i></p>
        {createHtml}

        <h2>Search for Notary Entries</h2>
        <div className="form"><label>
          Address:
          <input type="text" value={this.state.signer} onChange={this.getSetter('signer')} />
        </label>
        <label>
          Document Hash (SHA-256):
          <input type="text" value={this.state.documentHash} onChange={this.getSetter('documentHash')} />
        </label>
          <button onClick={this.findEntries}>Find Entries</button>
        </div>
        <ReactTable
          data={this.state.foundEntries}
          columns={columns}
        />
      </div>
    );
  }
}

export default App;
