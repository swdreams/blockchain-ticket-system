import React, { Component } from "react";
import EventContract from "./contracts/EventContract.json";
import getWeb3 from "./getWeb3";
import PropTypes from 'prop-types';
import Box from '@material-ui/core/Box';
import styled from 'styled-components';
import { green, orange } from '@material-ui/core/colors';
import { Button, Typography, AppBar, Tabs, Tab, Backdrop, CircularProgress, FormControl } from '@material-ui/core';

import "./App.css";
import CreateEvent from "./components/CreateEvent";
import BrowseEvents from "./components/BrowseEvents";
import MyTickets from "./components/MyTickets";
import MyEvents from "./components/MyEvents";

const PendingButton = styled(Button)`
  && {
    text-transform: none;
    background-color: ${orange[200]};
  }
`;

const ConfirmedButton = styled(Button)`
  text-transform: none;
  background-color: ${green[200]};
`;


function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`app-tabpanel-${index}`}
      aria-labelledby={`app-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </Typography>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function tabProps(index) {
  return {
    id: `app-tab-${index}`,
    'aria-controls': `app-tabpanel-${index}`,
  };
}

function SimpleBackdrop() {
  return (
    <div>
      <Backdrop  open={true}>
        <FormControl>
          <CircularProgress color="inherit" />
          Loading contract data...
        </FormControl>
      </Backdrop>
    </div>
  );
}

class App extends Component {
  state = { web3: null, accounts: null, contract: null, activeTab: 3, pending: [], confirmed: [] };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = EventContract.networks[networkId];
      const instance = new web3.eth.Contract(
        EventContract.abi,
        deployedNetwork.address
      );

      instance.options.handleRevert = true;

      // Set web3, accounts, and contract to the state
      this.setState({ web3, accounts, contract: instance});

      // load list of event IDs
      await this.load_event_list();

      // cache all events
      await this.load_events();

      // Listen for the EventCreated event to be emitted from the contract
      instance.events.EventCreated(async (err, res) => {
        if(!err){
          await this.reload_event(res.returnValues.event_id);
          await this.load_event_list();
        }
      });

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  load_event_list = async () => {
    let event_list = await this.state.contract.methods.get_events().call();
    this.setState({event_list: event_list});
  }

  load_events = async () => {
    let events = new Map();
    await Promise.all(this.state.event_list.map(async (event) => {
      events.set(event, await this.state.contract.methods.get_event_info(event).call());
    }));
    this.setState({ events: events });
  }

  reload_event = async (event_id) => {
    let updated_event = await this.state.contract.methods.get_event_info(event_id).call();
    this.setState((prevState) => {
      let updatedEvents = new Map(prevState.events);
      return { events: updatedEvents.set(event_id, updated_event)};
    });
  }

  delete_event = async (event_id) => {
    await this.load_event_list();
    this.setState((prevState) => {
      let updatedEvents = new Map(prevState.events);
      updatedEvents.delete(event_id);
      return { events: updatedEvents};
    });
  }

  changeTab = (event, value) => {
    this.setState({ activeTab: value });
  }

  confirm = async (tx) => {
    let pending = this.state.pending;
    pending.splice(pending.indexOf(tx), 1);
    this.setState({ pending: pending });
    this.setState({ confirmed: [...this.state.confirmed, tx] });
  }

  add_pending_tx = async (id) => {
    this.setState({ pending: [...this.state.pending, (id)] });
  }

  render() {

    if (!this.state.web3 || !this.state.events) {
      return <SimpleBackdrop/>;
    }

    return (
 
      <div className="App">
        <AppBar position="static">
          {this.state.pending.map((tx) => {
            let short = tx.substring(0,15) + '...';
            return (
              <PendingButton 
                variant="contained"
              >Transaction with id {short} is pending</PendingButton>
            );
          })}
          {this.state.confirmed.map((tx) => {
            let short = tx.substring(0,15) + '...';
            return (
              <ConfirmedButton 
                variant="contained"
                onClick={() => {
                  let conf = this.state.confirmed;
                  conf.splice(conf.indexOf(tx), 1);
                  this.setState({ confirmed: conf });
                }}
              >Transaction with id {short} has been confirmed! Click to dismiss.</ConfirmedButton>
            );
          })}
          <Tabs
            value={this.state.activeTab}
            indicatorColor="primary"
            textColor="primary"
            centered={true}
            onChange={this.changeTab}
            aria-label="simple tabs example"
          >
            <Tab label="Browse events" {...tabProps(0)} />
            <Tab label="My tickets" {...tabProps(1)} />
            <Tab label="My events" {...tabProps(2)} />
            <Tab label="Create event" {...tabProps(3)} />
          </Tabs>
        </AppBar>
        <TabPanel value={this.state.activeTab} index={0}>
          <BrowseEvents 
            contract={this.state.contract} 
            accounts={this.state.accounts}
            event_list={this.state.event_list}
            events={this.state.events}
            reload_event={this.reload_event}
            confirm={this.confirm}
            add_pending_tx={this.add_pending_tx}
            web3={this.state.web3}/>
        </TabPanel>

        <TabPanel value={this.state.activeTab} index={1}>
            <MyTickets 
              accounts={this.state.accounts} 
              contract={this.state.contract}
              reload_event={this.reload_event}
              confirm={this.confirm}
              add_pending_tx={this.add_pending_tx}
              events={this.state.events}/>
        </TabPanel>

        <TabPanel value={this.state.activeTab} index={2}>
            <MyEvents
              accounts={this.state.accounts} 
              contract={this.state.contract} 
              event_list={this.state.event_list}
              events={this.state.events}
              reload_event={this.reload_event}
              delete_event={this.delete_event}
              confirm={this.confirm}
              add_pending_tx={this.add_pending_tx}
              web3={this.state.web3}/>
        </TabPanel>

        <TabPanel value={this.state.activeTab} index={3}>
            <CreateEvent 
              event_list={this.state.event_list}
              web3={this.state.web3} 
              accounts={this.state.accounts} 
              contract={this.state.contract}
              confirm={this.confirm}
              add_pending_tx={this.add_pending_tx}/>
        </TabPanel>

      </div>
    );
  }
}

export default App;
