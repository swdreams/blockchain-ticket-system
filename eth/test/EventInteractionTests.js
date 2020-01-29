const EventContract = artifacts.require("EventContract");

contract('EventContract', (accounts) => {

  let eventC;
  const eth = 1e18; //1 eth in wei units
  const ticket_price = 1e16; // 0.01 eth
  let receipt = [];
  let buyer = accounts[1];
  const owner = accounts[0];

  it('Setup', async () => {
    eventC = await EventContract.deployed();
    //balance_before = parseFloat(await web3.eth.getBalance(accounts[1]));
    let actual_n_tickets = await eventC.available_tickets();
    let actual_ticket_price = await eventC.ticket_price();
    console.log(`     Available tickets: ${actual_n_tickets}`);
    console.log(`     Ticket price: ${parseFloat(actual_ticket_price)}`);
  })

  it('Attempt to buy tickets', async () => {
    let tickets_to_buy = 1;
    receipt.push(await eventC.buy_tickets(tickets_to_buy, {from:buyer, value:ticket_price}));
    console.log(`     Gas used to buy ${tickets_to_buy} ticket(s): ${receipt[0].receipt.gasUsed}`);

    let buyers_tickets = await eventC.get_tickets(buyer, {from:owner});
    assert.equal(buyers_tickets, tickets_to_buy);

    tickets_to_buy = 5;
    receipt.push(await eventC.buy_tickets(tickets_to_buy, {from:buyer, value:ticket_price*tickets_to_buy}));
    console.log(`     Gas used to buy ${tickets_to_buy} ticket(s): ${receipt[1].receipt.gasUsed}`);

    buyers_tickets = await eventC.get_tickets(buyer, {from:owner});
    assert.equal(buyers_tickets, tickets_to_buy+1);
  });

  it('Attempt to buy a ticket with insufficient amount', async () => {
    buyer = accounts[2];
    let tickets_to_buy = 1;
    let amount = 5e15; // 0.005 eth
    try {
      await eventC.buy_tickets(tickets_to_buy, {from:buyer, value:amount});
      assert.fail("Attempt to buy ticket at less than actual price succeeded");
    } catch (error) {
      if(error.message.search('Not enough ether was sent') > -1) {
        // correct outcome, test should pass
      } else {
        assert.fail(error.message);
      }
    }
  });

  it('Attempt to buy a ticket with excessive amount', async () => {
    buyer = accounts[3];
    let balance_before = BigInt(await web3.eth.getBalance(buyer));
    let tickets_to_buy = 1;
    let amount = 2*ticket_price;
    try {
      let rcpt = await eventC.buy_tickets(tickets_to_buy, {from:buyer, value:amount});
      let tx = await web3.eth.getTransaction(rcpt.tx);
      let total_gas_cost = tx.gasPrice*rcpt.receipt.gasUsed;

      let expected_balance = balance_before - BigInt(ticket_price) - BigInt(total_gas_cost);
      let balance_after = BigInt(await web3.eth.getBalance(buyer));
      assert.equal(expected_balance, balance_after);
    } catch (error) {
      assert.fail(error.message);
    }
  });

  it('Attempt to withdraw funds from unauthorized address', async () => {
    try {
      await eventC.withdraw_funds({from:buyer});
      assert.fail("Unauthorized address was allowed to call withdraw_funds");
    } catch (error) {
      if(error.message.search('User was not authorized') > -1) {
        // correct outcome, test should pass
      } else {
        throw error;
      }
    }
  });

  it('Stop and continue sale', async () => {
    await eventC.stop_sale({from:owner});
    let _sale_active = await eventC.sale_active();
    assert.equal(_sale_active, false);

    try {
      await eventC.buy_tickets(1, {from:buyer, value:ticket_price})
      assert.fail("Ticket sale was not stopped");
    } catch (error) {
      if(error.message.search('Ticket sale is closed by seller') > -1) {
        // correct outcome, test should pass
      } else {
        assert.fail(error.message);
      }
    }

    await eventC.continue_sale({from:owner});
    _sale_active = await eventC.sale_active();
    assert.equal(_sale_active, true);
  });

  it('Add tickets', async () => {
    let _n_tickets = parseFloat(await eventC.available_tickets());
    await eventC.add_tickets(10, {from:owner});
    let new_n_tickets = parseFloat(await eventC.available_tickets());
    assert.equal(_n_tickets+10, new_n_tickets);
  });

  it('Attempt to steal tickets using integer overflow', async () => {
    // 2^63 = 9223372036854775808
    let contract = await EventContract.new('9223372036854775808', '2');
    try {
      // num_tickets*ticket_price = 2^63 * 2 = 2^64, which will overflow to 0 when using uint64
      await contract.buy_tickets('9223372036854775808', { from: accounts[4], value: 1 });
      assert.fail('Was able to buy 2^63 tickets for only 1 wei');
    } catch (error) {
      if(error.message.search('Not enough ether was sent') < 0) {
        throw error;
      }
    }
  });
});
