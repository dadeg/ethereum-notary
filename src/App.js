/* global web3 */
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import NotaryStoreContract from 'ethereum-notary-contracts';
import contract from 'truffle-contract';

import ReactTable from 'react-table';
import 'react-table/react-table.css';

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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { foundEntries: [] };
    this.findEntries = this.findEntries.bind(this);
  }

  createEntry() {
    return getInstance().then(instance => {
      return Promise.resolve(instance.create('12345666'));
    });
  }

  findEntries() {
    this.setState(prevState => {
      return Object.assign({}, prevState, { foundEntries: [] });
    });

    getInstance().then(instance => {
      const entryEvent = instance.Entry({}, { fromBlock: 0, toBlock: 'latest' });
      entryEvent.watch((err, response) => {
        this.setState(prevState => {
          prevState.foundEntries.push(response.args);
          return prevState;
        });
      });
    });
  }

  render() {

    const columns = [{
      Header: 'Signer\'s Address',
      accessor: 'signer' // String-based value accessors!
    }, {
      Header: 'Document Hash (SHA512)',
      accessor: 'documentHash'
    }]

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <button onClick={this.createEntry}>Create Entry</button>
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
