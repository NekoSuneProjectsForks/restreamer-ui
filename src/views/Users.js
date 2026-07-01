import React from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

import { useLingui } from '@lingui/react';
import { Trans, t } from '@lingui/macro';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import Dialog from '../misc/modals/Dialog';
import NotifyContext from '../contexts/Notify';
import Paper from '../misc/Paper';
import PaperContent from '../misc/PaperContent';
import PaperFooter from '../misc/PaperFooter';
import PaperHeader from '../misc/PaperHeader';
import Password from '../misc/Password';
import Select from '../misc/Select';
import TextField from '../misc/TextField';

const emptyForm = {
	id: null,
	username: '',
	password: '',
	role: 'user',
	max_processes: 2,
};

export default function Users(props) {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const notify = React.useContext(NotifyContext);

	const [$users, setUsers] = React.useState(null);
	const [$dialog, setDialog] = React.useState({ open: false, form: emptyForm });
	const [$deleteDialog, setDeleteDialog] = React.useState({ open: false, user: null });
	const [$saving, setSaving] = React.useState(false);

	React.useEffect(() => {
		(async () => {
			await load();
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const load = async () => {
		const list = await props.restreamer.ListUsers();
		setUsers(list);
	};

	const handleAbort = () => {
		navigate(-1);
	};

	const handleAddDialog = () => {
		setDialog({ open: true, form: { ...emptyForm } });
	};

	const handleEditDialog = (user) => () => {
		setDialog({
			open: true,
			form: {
				id: user.id,
				username: user.username,
				password: '',
				role: user.role,
				max_processes: user.max_processes,
			},
		});
	};

	const handleDialogClose = () => {
		setDialog({ ...$dialog, open: false });
	};

	const handleChange = (what) => (event) => {
		setDialog({
			...$dialog,
			form: {
				...$dialog.form,
				[what]: event.target.value,
			},
		});
	};

	const handleSave = async () => {
		const form = $dialog.form;
		const username = form.username.trim();

		if (username.length === 0) {
			notify.Dispatch('error', 'save:user', i18n._(t`Username must not be empty`));
			return;
		}

		setSaving(true);

		const maxProcesses = parseInt(form.max_processes) || 0;

		let err = null;

		if (form.id === null) {
			if (form.password.length === 0) {
				notify.Dispatch('error', 'save:user', i18n._(t`Password must not be empty`));
				setSaving(false);
				return;
			}

			[, err] = await props.restreamer.CreateUser({
				username: username,
				password: form.password,
				role: form.role,
				max_processes: maxProcesses,
			});
		} else {
			[, err] = await props.restreamer.UpdateUser(form.id, {
				role: form.role,
				max_processes: maxProcesses,
				password: form.password,
			});
		}

		setSaving(false);

		if (err !== null) {
			notify.Dispatch('error', 'save:user', i18n._(t`Failed to save user (${err.message})`));
			return;
		}

		notify.Dispatch('success', 'save:user', i18n._(t`User saved`));

		setDialog({ ...$dialog, open: false });

		await load();
	};

	const handleDeleteDialog = (user) => () => {
		setDeleteDialog({ open: true, user: user });
	};

	const handleDeleteDialogClose = () => {
		setDeleteDialog({ ...$deleteDialog, open: false });
	};

	const handleDelete = async () => {
		const user = $deleteDialog.user;
		if (!user) {
			return;
		}

		const ok = await props.restreamer.DeleteUser(user.id);
		if (ok === false) {
			notify.Dispatch('error', 'delete:user', i18n._(t`Failed to delete user`));
			return;
		}

		notify.Dispatch('success', 'delete:user', i18n._(t`User deleted`));

		setDeleteDialog({ open: false, user: null });

		await load();
	};

	if ($users === null) {
		return null;
	}

	return (
		<React.Fragment>
			<Paper xs={12} sm={10} md={8}>
				<PaperHeader title={<Trans>Users</Trans>} onAbort={handleAbort} onAdd={handleAddDialog} />
				<PaperContent>
					<Typography variant="body1" gutterBottom>
						<Trans>
							The bootstrap admin login can always sign in and manage everything. Named users you create here can only see and manage their
							own restreams, up to their quota.
						</Trans>
					</Typography>
					{$users.length === 0 ? (
						<Typography variant="body1">
							<Trans>No named users yet.</Trans>
						</Typography>
					) : (
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>
										<Trans>Username</Trans>
									</TableCell>
									<TableCell>
										<Trans>Role</Trans>
									</TableCell>
									<TableCell>
										<Trans>Max. restreams</Trans>
									</TableCell>
									<TableCell align="right"></TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{$users.map((user) => (
									<TableRow key={user.id}>
										<TableCell>{user.username}</TableCell>
										<TableCell>{user.role === 'admin' ? <Trans>Admin</Trans> : <Trans>User</Trans>}</TableCell>
										<TableCell>{user.role === 'admin' ? <Trans>Unlimited</Trans> : user.max_processes}</TableCell>
										<TableCell align="right">
											<IconButton size="small" onClick={handleEditDialog(user)}>
												<EditIcon fontSize="small" />
											</IconButton>
											<IconButton size="small" onClick={handleDeleteDialog(user)}>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</PaperContent>
				<PaperFooter
					buttonsRight={
						<Button variant="outlined" color="primary" onClick={handleAddDialog}>
							<Trans>Add user</Trans>
						</Button>
					}
				/>
			</Paper>
			<Dialog
				open={$dialog.open}
				onClose={handleDialogClose}
				title={$dialog.form.id === null ? <Trans>Add user</Trans> : <Trans>Edit user</Trans>}
				buttonsLeft={
					<Button variant="outlined" color="default" onClick={handleDialogClose}>
						<Trans>Abort</Trans>
					</Button>
				}
				buttonsRight={
					<Button variant="outlined" color="primary" disabled={$saving === true} onClick={handleSave}>
						<Trans>Save</Trans>
					</Button>
				}
			>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<TextField
							label={<Trans>Username</Trans>}
							value={$dialog.form.username}
							disabled={$dialog.form.id !== null}
							onChange={handleChange('username')}
						/>
					</Grid>
					<Grid item xs={12}>
						<Password
							label={$dialog.form.id === null ? <Trans>Password</Trans> : <Trans>New password (leave empty to keep current)</Trans>}
							value={$dialog.form.password}
							onChange={handleChange('password')}
						/>
					</Grid>
					<Grid item xs={12}>
						<Select label={<Trans>Role</Trans>} value={$dialog.form.role} onChange={handleChange('role')}>
							<MenuItem value="user">
								<Trans>User</Trans>
							</MenuItem>
							<MenuItem value="admin">
								<Trans>Admin</Trans>
							</MenuItem>
						</Select>
					</Grid>
					{$dialog.form.role !== 'admin' && (
						<Grid item xs={12}>
							<TextField
								type="number"
								label={<Trans>Max. restreams</Trans>}
								value={$dialog.form.max_processes}
								onChange={handleChange('max_processes')}
							/>
						</Grid>
					)}
				</Grid>
			</Dialog>
			<Dialog
				open={$deleteDialog.open}
				onClose={handleDeleteDialogClose}
				title={<Trans>Do you want to delete this user?</Trans>}
				buttonsLeft={
					<Button variant="outlined" color="default" onClick={handleDeleteDialogClose}>
						<Trans>Abort</Trans>
					</Button>
				}
				buttonsRight={
					<Button variant="outlined" color="secondary" onClick={handleDelete}>
						<Trans>Delete</Trans>
					</Button>
				}
			/>
		</React.Fragment>
	);
}

Users.propTypes = {
	restreamer: PropTypes.object,
};

Users.defaultProps = {
	restreamer: null,
};
