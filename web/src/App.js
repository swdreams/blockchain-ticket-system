import React, { Component } from "react";
import EventContract from "./contracts/EventContract.json";
import getWeb3 from "./getWeb3";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import AppBar from '@material-ui/core/AppBar';
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

import "./App.css";

const styles = {
    fontFamily: 'sans-serif',
};

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

function a11yProps(index) {
  return {
    id: `app-tab-${index}`,
    'aria-controls': `app-tabpanel-${index}`,
  };
}

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}));

class App extends Component {
  state = { web3: null, accounts: null, contract: null, activeTab: 0 };

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
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runExample = async () => {
    const { accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    //await contract.methods.set(5).send({ from: accounts[0] });

    // Get the value from the contract to prove it worked.
    //const response = await contract.methods.get().call();

    // Update state with the result.
    //this.setState({ storageValue: response });
  };

  changeTab = (event, value) => {
    this.setState({ activeTab: value });
  }

  render() {

    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }

    return (
      <div className="App">
        <AppBar position="static">
            <Tabs
                value={this.state.activeTab}
                indicatorColor="primary"
                textColor="primary"
                centered="True"
                onChange={this.changeTab}
                aria-label="simple tabs example"
            >
                <Tab label="Browse events" {...a11yProps(0)} />
                <Tab label="My tickets" {...a11yProps(1)} />
                <Tab label="My events" {...a11yProps(2)} />
                <Tab label="Create event" {...a11yProps(3)} />
            </Tabs>
        </AppBar>
        <TabPanel value={this.state.activeTab} index={0}>
            <h1>Browsing events</h1>
        </TabPanel>

        <TabPanel value={this.state.activeTab} index={1}>
            <h1>My tickets</h1>
        </TabPanel>

        <TabPanel value={this.state.activeTab} index={2}>
            <h1>My events</h1>
        </TabPanel>

        <TabPanel value={this.state.activeTab} index={3}>
            <h1>Create event</h1>
            <TextField id="event_ID" label="Unique event ID" variant="outlined" required="True" />
            <TextField id="event_title" label="Event title" variant="outlined" required="True" />
            <TextField id="event_title" label="Event title" variant="outlined" required="True" />
        </TabPanel>

      </div>
    );
  }
}

export default App;
