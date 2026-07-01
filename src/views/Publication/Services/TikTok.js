import React from 'react';

import { Trans } from '@lingui/macro';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import Logo from './logos/tiktok.svg';

import FormInlineButton from '../../../misc/FormInlineButton';
import Password from '../../../misc/Password';

const id = 'tiktok';
const name = 'TikTok';
const version = '1.0';
const stream_key_link = 'https://www.tiktok.com/live';
const description = (
	<Trans>
		Live-Streaming to TikTok LIVE via RTMP. Either paste a server URL and stream key from TikTok LIVE Studio directly, or provide a
		Streamlabs account token so this can start/stop the TikTok session automatically together with the source stream, with a title and
		game category. Requires TikTok LIVE access on your account.
	</Trans>
);
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
	return <img src={Logo} alt="TikTok Logo" {...props} />;
}

function init(settings) {
	const initSettings = {
		// TikTok/Streamlabs hand out a server address per session, not a
		// fixed one - leave this empty until you paste one from TikTok LIVE
		// Studio, or let the automatic Streamlabs flow below fill it in.
		server: '',
		key: '',
		token: '',
		title: '',
		game: null,
		sessionId: '',
		...settings,
	};

	return initSettings;
}

function createOutput(settings) {
	const output = {
		address: settings.server + settings.key,
		options: ['-f', 'flv'],
	};

	return output;
}

// canAutomate reports whether enough is configured to drive TikTok's
// start/stop automatically from the source stream's live state, rather than
// relying on the plain manual server/key fields.
function canAutomate(settings) {
	return settings.token.length !== 0 && settings.game !== null;
}

// searchGames queries Streamlabs' TikTok category lookup. This needs a
// Streamlabs account bearer token (see the token field below) - it's the
// same token Streamlabs Desktop uses, there's no way to get one without
// going through Streamlabs' own login flow first (see the docs link).
async function searchGames(token, query) {
	if (!token || !query) {
		return [];
	}

	const url = 'https://streamlabs.com/api/v5/slobs/tiktok/info?category=' + encodeURIComponent(query.slice(0, 25));

	const res = await fetch(url, {
		headers: { Authorization: 'Bearer ' + token },
	});

	if (!res.ok) {
		throw new Error('Streamlabs returned ' + res.status);
	}

	const data = await res.json();

	return data.categories || [];
}

// startLive asks Streamlabs to start a TikTok LIVE session with the settings'
// title/category and returns settings updated with the fresh RTMP
// server/key/sessionId it hands back. This is a "go live now" call on
// TikTok's side - only call it when the source is actually about to (or
// just did) go live, not speculatively.
async function startLive(settings) {
	const body = new FormData();
	body.append('title', settings.title);
	body.append('device_platform', 'win32');
	body.append('category', settings.game ? settings.game.game_mask_id : '');
	body.append('audience_type', '0');

	const res = await fetch('https://streamlabs.com/api/v5/slobs/tiktok/stream/start', {
		method: 'POST',
		headers: { Authorization: 'Bearer ' + settings.token },
		body,
	});

	if (!res.ok) {
		throw new Error('Streamlabs returned ' + res.status);
	}

	const data = await res.json();

	return {
		...settings,
		server: data.rtmp,
		key: data.key,
		sessionId: '' + data.id,
	};
}

// endLive tells Streamlabs the TikTok LIVE session is over. There's no
// "update while live" endpoint - changing title/game requires ending the
// current session and starting a new one, which briefly drops the stream.
async function endLive(settings) {
	if (!settings.sessionId) {
		return true;
	}

	const res = await fetch('https://streamlabs.com/api/v5/slobs/tiktok/stream/' + settings.sessionId + '/end', {
		method: 'POST',
		headers: { Authorization: 'Bearer ' + settings.token },
	});

	if (!res.ok) {
		throw new Error('Streamlabs returned ' + res.status);
	}

	const data = await res.json();

	return data.success === true;
}

function Service(props) {
	const settings = init(props.settings);

	const [$gameOptions, setGameOptions] = React.useState([]);
	const [$gameLoading, setGameLoading] = React.useState(false);
	const [$busy, setBusy] = React.useState(false);
	const [$error, setError] = React.useState('');
	const searchTimer = React.useRef(null);

	const emitChange = (newSettings) => {
		const output = createOutput(newSettings);
		props.onChange([output], newSettings);
	};

	const handleChange = (what) => (event) => {
		settings[what] = event.target.value;
		emitChange(settings);
	};

	const handleGameSearch = (event, value) => {
		if (searchTimer.current) {
			clearTimeout(searchTimer.current);
		}

		searchTimer.current = setTimeout(async () => {
			setGameLoading(true);
			try {
				const categories = await searchGames(settings.token, value);
				setGameOptions(categories);
				setError('');
			} catch (err) {
				setError(err.message);
			} finally {
				setGameLoading(false);
			}
		}, 400);
	};

	const handleGameSelect = (event, value) => {
		settings.game = value;
		emitChange(settings);
	};

	// While not live yet: just preview a fresh server/key so the "manual"
	// fields above reflect what will be used. While live: actually restart
	// the TikTok session (end + start) with the current title/game, and ask
	// the parent to restart the publication process against the new
	// server/key - this is a real interruption of the live broadcast, there
	// is no way to update title/game without one.
	const handleFetchOrUpdate = async () => {
		setBusy(true);
		setError('');
		try {
			if (props.live && settings.sessionId) {
				await endLive(settings);
			}

			const updated = await startLive(settings);
			emitChange(updated);

			if (props.live) {
				await props.onLiveUpdate();
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Grid container spacing={2}>
			<Grid item xs={12} md={9}>
				<TextField
					variant="outlined"
					fullWidth
					label={<Trans>Server URL</Trans>}
					value={settings.server}
					onChange={handleChange('server')}
					disabled={props.live}
				/>
			</Grid>
			<Grid item xs={12} md={3}>
				<FormInlineButton target="blank" href={stream_key_link} component="a">
					<Trans>GET</Trans>
				</FormInlineButton>
			</Grid>
			<Grid item xs={12}>
				<TextField
					variant="outlined"
					fullWidth
					label={<Trans>Stream key</Trans>}
					value={settings.key}
					onChange={handleChange('key')}
					disabled={props.live}
				/>
			</Grid>
			<Grid item xs={12}>
				<Accordion className="accordion" defaultExpanded={canAutomate(settings)}>
					<AccordionSummary className="accordion-summary" elevation={0} expandIcon={<ArrowDropDownIcon />}>
						<Typography>
							<Trans>Automatic via Streamlabs (start/stop with the source, title, game)</Trans>
						</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={2}>
							<Grid item xs={12}>
								<Password
									variant="outlined"
									fullWidth
									label={<Trans>Streamlabs account token</Trans>}
									value={settings.token}
									onChange={handleChange('token')}
									disabled={props.live}
								/>
								<Typography variant="caption">
									<Trans>
										Streamlabs' own token, not a TikTok one - there's no way to obtain it without going through Streamlabs'
										login flow in a tool like Streamlabs Desktop first. This is not an officially documented API and may
										break without notice. Once a token and a game are set, this publication starts automatically when the
										source goes live and ends automatically when it stops - the manual connect/disconnect button still
										works too, but shouldn't be needed.
									</Trans>
								</Typography>
							</Grid>
							<Grid item xs={12}>
								<TextField
									variant="outlined"
									fullWidth
									label={<Trans>Title</Trans>}
									value={settings.title}
									onChange={handleChange('title')}
								/>
							</Grid>
							<Grid item xs={12}>
								<Autocomplete
									options={$gameOptions}
									loading={$gameLoading}
									getOptionLabel={(option) => option.full_name || ''}
									isOptionEqualToValue={(option, value) => option.game_mask_id === value.game_mask_id}
									value={settings.game}
									onChange={handleGameSelect}
									onInputChange={handleGameSearch}
									disabled={!settings.token}
									renderInput={(params) => (
										<TextField
											{...params}
											variant="outlined"
											label={<Trans>Game</Trans>}
											InputProps={{
												...params.InputProps,
												endAdornment: (
													<React.Fragment>
														{$gameLoading && <CircularProgress color="inherit" size={20} />}
														{params.InputProps.endAdornment}
													</React.Fragment>
												),
											}}
										/>
									)}
								/>
								<Typography variant="caption">
									<Trans>Requires a token above. Type to search TikTok's game categories.</Trans>
								</Typography>
							</Grid>
							<Grid item xs={12}>
								<FormInlineButton onClick={handleFetchOrUpdate} disabled={!settings.token || $busy}>
									{props.live ? <Trans>Update title/game now</Trans> : <Trans>Preview server/key from Streamlabs</Trans>}
								</FormInlineButton>
								<Typography variant="caption" display="block">
									{props.live ? (
										<Trans>
											This ends the current TikTok session and starts a new one with the title/game above - viewers will see
											the stream briefly drop and reconnect. There's no way to change title/game on TikTok without doing
											this.
										</Trans>
									) : (
										<Trans>Just a preview - the real session starts automatically once the source goes live.</Trans>
									)}
								</Typography>
							</Grid>
							{$error.length !== 0 && (
								<Grid item xs={12}>
									<Typography color="error">{$error}</Typography>
								</Grid>
							)}
						</Grid>
					</AccordionDetails>
				</Accordion>
			</Grid>
		</Grid>
	);
}

Service.defaultProps = {
	settings: {},
	skills: {},
	metadata: {},
	streams: [],
	live: false,
	onChange: function (output, settings) {},
	onLiveUpdate: async function () {},
};

const func = {
	init,
	createOutput,
	canAutomate,
	startLive,
	endLive,
};

export { id, name, version, stream_key_link, description, image_copyright, author, category, requires, ServiceIcon as icon, Service as component, func };
