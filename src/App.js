/* global web3 */
import React, { Component } from 'react';
import logo from './logo.svg';
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
      console.log(this.state.documentHashToUpload);
      return Promise.resolve(instance.create("0x" + this.state.documentHashToUpload)); // adding 0x because it is needed for Solidity to recognize the hash as byte32
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
      Header: 'Document Hash (SHA512)',
      accessor: 'documentHash'
    }];

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <Dropzone onDrop={this.onDrop}>
          <p>Try dropping some files here, or click to select files to upload.</p>
        </Dropzone>
        <p>Uploaded Document's Hash: {this.state.documentHashToUpload || "upload a document first"}</p>
        <button onClick={this.createEntry}>Create Entry with Document Hash</button>
        <label>
          Signer (Address):
          <input type="text" value={this.state.signer} onChange={this.getSetter('signer')} />
        </label>
        <label>
          Document Hash (SHA-256):
          <input type="text" value={this.state.documentHash} onChange={this.getSetter('documentHash')} />
        </label>
        <button onClick={this.findEntries}>Find Entries</button>
        <ReactTable
          data={this.state.foundEntries}
          columns={columns}
        />
      </div>
    );
  }
}

export default App;
