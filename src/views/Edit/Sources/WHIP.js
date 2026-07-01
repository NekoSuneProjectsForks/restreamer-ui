import React from 'react';

import { Trans } from '@lingui/macro';
import makeStyles from '@mui/styles/makeStyles';
import Grid from '@mui/material/Grid';
import Icon from '@mui/icons-material/SettingsInputAntenna';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import BoxText from '../../../misc/BoxText';
import BoxTextarea from '../../../misc/BoxTextarea';
import FormInlineButton from '../../../misc/FormInlineButton';
import Textarea from '../../../misc/Textarea';

const useStyles = makeStyles((theme) => ({
	gridContainer: {
		marginTop: '0.5em',
	},
}));

const initSettings = (initialSettings) => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		name: '',
		...initialSettings,
	};

	return settings;
};

// createInputs builds the ffmpeg input for a WHIP-published resource. The
// {whip,name=...} placeholder is resolved by core (see the "whip" template
// registered in app/api/api.go) to the local SDP file it writes for that
// resource once a WHIP publisher connects; -protocol_whitelist is required
// because that SDP file itself references further file/udp/rtp addresses.
const createInputs = (settings) => {
	const input = {
		address: '',
		options: ['-protocol_whitelist', 'file,rtp,udp'],
	};

	if (settings.name.length !== 0) {
		input.address = '{whip,name=' + settings.name + '}';
	}

	return [input];
};

const isValidName = (name) => {
	return /^[A-Za-z0-9_-]+$/.test(name);
};

const getWHIPAddress = (name) => {
	return window.location.protocol + '//' + window.location.host + '/whip/' + name;
};

function Source(props) {
	const classes = useStyles();
	const settings = initSettings(props.settings);
	const validName = isValidName(settings.name);

	const handleChange = (what) => (event) => {
		settings[what] = event.target.value;

		props.onChange({
			...settings,
		});
	};

	const handleProbe = () => {
		props.onProbe(settings, createInputs(settings));
	};

	return (
		<Grid container alignItems="flex-start" spacing={2} className={classes.gridContainer}>
			<Grid item xs={12}>
				<Typography>
					<Trans>Choose a name for this stream. It's part of the publish URL, so keep it hard to guess.</Trans>
				</Typography>
			</Grid>
			<Grid item xs={12}>
				<TextField
					variant="outlined"
					fullWidth
					label={<Trans>Stream name</Trans>}
					placeholder="my-stream"
					value={settings.name}
					onChange={handleChange('name')}
				/>
			</Grid>
			{settings.name.length !== 0 && !validName && (
				<Grid item xs={12}>
					<BoxText color="dark">
						<Typography>
							<Trans>Only letters, numbers, "-" and "_" are allowed.</Trans>
						</Typography>
					</BoxText>
				</Grid>
			)}
			{validName && (
				<React.Fragment>
					<Grid item xs={12}>
						<Typography>
							<Trans>
								Publish to this URL with a WHIP-capable encoder (e.g. OBS Studio's WHIP output, or a browser). This uses WebRTC, so
								latency is typically sub-second.
							</Trans>
						</Typography>
					</Grid>
					<Grid item xs={12}>
						<BoxTextarea>
							<Textarea rows={1} value={getWHIPAddress(settings.name)} readOnly allowCopy />
						</BoxTextarea>
					</Grid>
				</React.Fragment>
			)}
			<Grid item xs={12}>
				<Typography variant="caption">
					<Trans>
						Requires the WebRTC server to be enabled. See{' '}
						<Link color="secondary" target="_blank" href="https://www.ietf.org/archive/id/draft-ietf-wish-whip-16.html">
							RFC 9725 (WHIP)
						</Link>
						.
					</Trans>
				</Typography>
			</Grid>
			<Grid item xs={12}>
				<FormInlineButton onClick={handleProbe} disabled={!validName}>
					<Trans>Probe</Trans>
				</FormInlineButton>
			</Grid>
		</Grid>
	);
}

Source.defaultProps = {
	knownDevices: [],
	settings: {},
	onChange: function (settings) {},
	onProbe: function (settings, inputs) {},
	onRefresh: function () {},
};

function SourceIcon(props) {
	return <Icon style={{ color: '#FFF' }} {...props} />;
}

const id = 'whip';
const name = <Trans>WHIP (WebRTC)</Trans>;
const capabilities = ['audio', 'video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';

const func = {
	initSettings,
	createInputs,
	isValidName,
	getWHIPAddress,
};

export { id, name, capabilities, ffversion, SourceIcon as icon, Source as component, func };
