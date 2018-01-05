/* global web3 */
import NotaryStoreContract from 'ethereum-notary-contracts';
import contract from 'truffle-contract';

if (typeof web3 === 'undefined') {
  alert('web3 not found. Use MetaMask or another web3 client.');
}

web3 = new Web3(web3.currentProvider);

let storeInstance;

export function getInstance() {
  if (storeInstance) { return Promise.resolve(storeInstance); }

  return createStoreInstance().then(instance => {
    storeInstance = instance;
    return instance;
  });
}

function createStoreInstance() {
  const storeContract = contract(NotaryStoreContract);
  storeContract.setProvider(web3.currentProvider);
  storeContract.defaults({ from: web3.eth.defaultAccount });

  return storeContract.deployed();
}
