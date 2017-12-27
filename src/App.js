/* global web3 */
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import NotaryStoreContract from 'ethereum-notary-contracts';
import contract from 'truffle-contract';

class App extends Component {
  render() {
    if (!web3) { alert('Network error. Use something like MetaMask to connect to the Ethereum network.'); }
    const storeContract = contract(NotaryStoreContract);

    storeContract.setProvider(web3.currentProvider);
    storeContract.defaults({ from: web3.eth.defaultAccount });

    let storeInstance;

    storeContract.deployed().then(instance => {
      console.log('deployed', instance);
      storeInstance = instance;

      const foundEvent = storeInstance.FoundEntry(({}, { fromBlock: 0, toBlock: 'latest' }));

      foundEvent.watch((err, response) => {
        console.log('event foundEntry', err, response);
      });

      return storeInstance.create('asdf');
      // return 0;
    }).then(result => {
      console.log('result of create', result);
      return storeInstance.findAll('asdf');
    }).then(result => {
      console.log('result of read', result);
    }).catch(console.log);

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
