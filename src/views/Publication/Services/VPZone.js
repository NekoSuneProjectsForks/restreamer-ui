import React from 'react';

import { Trans } from '@lingui/macro';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import Logo from './logos/vpzone.png';

import FormInlineButton from '../../../misc/FormInlineButton';
import Select from '../../../misc/Select';

const id = 'vpzone';
const name = 'VPZone';
const version = '1.0';
const stream_key_link = 'https://vpzone.tv/';
const description = <Trans>Live-Streaming to VPZone RTMP Service.</Trans>;
const image_copyright = '';
const author = {
	creator: {
		name: 'datarhei',
		link: 'https://github.com/datarhei',
	},
	maintainer: {
		name: 'datarhei',
		link: 'https://github.com/datarhei',
	},
};
const category = 'platform';
const requires = {
	protocols: ['rtmp'],
	formats: ['flv'],
	codecs: {
		audio: ['aac', 'mp3'],
		video: ['h264'],
	},
};

function ServiceIcon(props) {
	return <img src={Logo} alt="VPZone Logo" {...props} />;
}

function init(settings) {
	const initSettings = {
		region: 'rtmp.vpzone.tv',
		key: '',
		...settings,
	};

	return initSettings;
}

function Service(props) {
	const settings = init(props.settings);

	const handleChange = (what) => (event) => {
		const value = event.target.value;

		settings[what] = value;

		const output = createOutput(settings);

		props.onChange([output], settings);
	};

	const createOutput = (settings) => {
		const output = {
			address: 'rtmp://' + settings.region + ':1935/live/' + settings.key,
			options: ['-f', 'flv'],
		};

		return output;
	};

	return (
		<Grid container spacing={2}>
			<Grid item xs={12}>
				<Select label={<Trans>Region</Trans>} value={settings.region} onChange={handleChange('region')}>
					<MenuItem value="rtmp.vpzone.tv">Canada</MenuItem>
					<MenuItem value="eur.vpzone.tv">EU</MenuItem>
				</Select>
			</Grid>
			<Grid item xs={12} md={9}>
				<TextField variant="outlined" fullWidth label={<Trans>Stream key</Trans>} value={settings.key} onChange={handleChange('key')} />
			</Grid>
			<Grid item xs={12} md={3}>
				<FormInlineButton target="blank" href={stream_key_link} component="a">
					<Trans>GET</Trans>
				</FormInlineButton>
			</Grid>
		</Grid>
	);
}

Service.defaultProps = {
	settings: {},
	skills: {},
	metadata: {},
	streams: [],
	onChange: function (output, settings) {},
};

export { id, name, version, stream_key_link, description, image_copyright, author, category, requires, ServiceIcon as icon, Service as component };
