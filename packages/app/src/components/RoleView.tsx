import { useEffect, useState } from "react"
import { Link as RouterLink, useParams } from "react-router-dom"
import { Box, Button, CircularProgress, Grid, Link, makeStyles, Typography } from "@material-ui/core"
import { AddSharp, ArrowBackSharp } from "@material-ui/icons"
import ButtonLink from "./ButtonLink"
import AddAddressModal from "./AddAddressModal"
import RemovedAddress from "./RemovedAddress"
import RoleMember from "./RoleMember"
import TargetParameters from "./TargetConfiguration"
import RoleTarget from "./RoleTarget"
import { ExecutionOptions, Target } from "../typings/role"
import { useRootDispatch, useRootSelector } from "../store"
import { getRoleById, getRoles, getRolesModifierAddress, getTransactionPending } from "../store/main/selectors"
import { fetchRoles } from "../store/main/rolesSlice"
import { updateRole, WalletType } from "../services/rolesModifierContract"
import { useWallet } from "../hooks/useWallet"

const useStyles = makeStyles((theme) => ({
  container: {
    height: "100%",
    position: "relative",
    flexGrow: 1,
    padding: 1,
    "&::before": {
      content: '" "',
      position: "absolute",
      zIndex: 1,
      top: "0px",
      left: "0px",
      right: "0px",
      bottom: "0px",
      border: "1px solid rgba(217, 212, 173, 0.3)",
      pointerEvents: "none",
    },
  },
  errorSpacing: {
    marginTop: theme.spacing(2),
  },
  img: {
    borderRadius: "50%",
    border: "1px solid rgba(217, 212, 173, 0.3)",
    padding: 4,
    width: 68,
  },
  item: {
    border: "1px solid rgba(217, 212, 173, 0.3)",
    height: "100%",
    padding: theme.spacing(2),
  },
  label: {
    color: theme.palette.text.primary,
    lineHeight: 1,
  },
  labelLink: {
    color: "rgba(217,212,173, 0.6)",
    cursor: "pointer",
    lineHeight: 1,
    "&:hover": {
      color: "rgba(217,212,173, 0.3)",
    },
  },
  labelWrapper: {
    alignItems: "flex-end",
    display: "flex",
    justifyContent: "space-between",
  },
  sideBar: {
    paddingRight: "0 !important",
    "& $item": {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    },
  },
  mainPanelZeroState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  viewRolesLink: {
    color: "rgb(217,212,173)",
    cursor: "pointer",
    fontSize: 16,
    textDecoration: "none !important",
    textUnderlineOffset: "2px",
    "&:hover": {
      textDecoration: "underline !important",
    },
  },
}))

const RoleView = () => {
  const classes = useStyles()
  const dispatch = useRootDispatch()
  const { roleId } = useParams()
  const role = useRootSelector(getRoleById(roleId))
  const roles = useRootSelector(getRoles)
  const isWaiting = useRootSelector(getTransactionPending)
  const [error, setError] = useState("")
  const [addMemberModalIsOpen, setAddMemberModalIsOpen] = useState(false)
  const [addTargetModalIsOpen, setAddTargetModalIsOpen] = useState(false)
  const [activeTarget, setActiveTarget] = useState<Target>()
  const [membersToAdd, setMembersToAdd] = useState<string[]>([])
  const [membersToRemove, setMembersToRemove] = useState<string[]>([])
  const [targetsToAdd, setTargetsToAdd] = useState<Target[]>([])
  const [targetsToRemove, setTargetsToRemove] = useState<string[]>([])
  const { provider, onboard } = useWallet()
  const rolesModifierAddress = useRootSelector(getRolesModifierAddress)

  useEffect(() => {
    dispatch(fetchRoles())
    setActiveTarget(role?.targets[0])
  }, [dispatch, roleId, role?.targets])

  if (!roleId) {
    return <>Missing role ID</>
  }

  if (roleId !== "new" && !role) {
    return <>Role with id: ${roleId} does not exist in this roles modifier</>
  }

  if (!rolesModifierAddress) {
    return <>No modifier address specified</>
  }

  if (!provider) {
    return <>No provider available.</>
  }

  const getWalletType = (): WalletType => {
    const wallet = onboard.getState().wallet
    if (wallet.name === "Gnosis Safe") {
      return WalletType.GNOSIS_SAFE
    } else {
      return WalletType.INJECTED
    }
  }

  /**
   * Security concern: roleId crashes is possible. This uses the currently available information.
   * - for instance there can be transactions in the mempool or not yet indexed buy the subgraph
   *
   * It depends on what the owner is how bad this is...
   *
   * @returns the roleId of the current role or the largest roleId+1 of the available roles
   */
  const getRoleId: () => string = () => {
    if (roleId === "new") {
      return Math.max
        .apply(
          Math,
          roles.map((role) => parseInt(role.id) + 1),
        )
        .toString()
    } else {
      return roleId
    }
  }

  const handleAddMember = (memberAddress: string) => {
    setMembersToAdd((current) => [...current, memberAddress])
    setAddMemberModalIsOpen(false)
    console.log(`Added ${memberAddress} to the list of members to add.`)
  }

  const handleRemoveMember = (memberAddress: string) => {
    setMembersToRemove((current) => [...current, memberAddress])
    console.log(`Added ${memberAddress} to the list of members to remove.`)
  }

  const handleAddTarget = (address: string) => {
    setTargetsToAdd((current) => [...current, { address, executionOptions: ExecutionOptions.NONE }])
    setAddTargetModalIsOpen(false)
    console.log(`Added ${address} to the list of targets to add.`)
  }

  const handleChangeTargetExecutionOptions = ({ address: targetAddress, executionOptions: newOptions }: Target) => {
    console.log("Change execution options - not implemented yet") // TODO
  }

  const handleRemoveTarget = (targetAddress: string) => {
    setTargetsToRemove((targetsToRemove) => [...targetsToRemove, targetAddress])
    console.log(`Added ${targetAddress} to the list of targets to remove.`)
  }

  const handleExecuteUpdate = async () => {
    try {
      await updateRole(
        provider,
        getWalletType(),
        rolesModifierAddress,
        getRoleId(),
        membersToAdd,
        membersToRemove,
        targetsToAdd,
        targetsToRemove,
      )
    } catch (error: any) {
      console.error(error)
      setError(error.message)
    }
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          mt: 1,
        }}
      >
        {roleId === "new" ? (
          <Typography variant="h4">Create a new role</Typography>
        ) : (
          <Typography variant="h4">Update role</Typography>
        )}
        <RouterLink to="/">
          <ButtonLink text="View all roles" icon={<ArrowBackSharp fontSize="small" />} />
        </RouterLink>
      </Box>

      <Grid container spacing={1} className={classes.container}>
        <Grid item xs={4} lg={3} className={classes.sideBar}>
          <Box className={classes.item}>
            <Box>
              <Typography variant="h5">Role #{getRoleId()}</Typography>
              <Box
                sx={{
                  bgcolor: "rgba(217, 212, 173, 0.1)",
                  height: 1,
                  my: 2,
                  width: "100%",
                }}
              />
              <Box className={classes.labelWrapper}>
                <Typography variant="body1" className={classes.label}>
                  Members
                </Typography>
                <Link href="#">
                  <Typography variant="body2" className={classes.labelLink}>
                    What's a member?
                  </Typography>
                </Link>
              </Box>
              <Box sx={{ mt: 1 }}>
                {role != null && role.members.length > 0 ? (
                  <>
                    {role.members.map((member, index) => {
                      return (
                        <>
                          <RoleMember
                            key={member.member.id}
                            member={member.member}
                            onRemoveMember={handleRemoveMember}
                          />
                          {index === 1 && <RemovedAddress address={member.member.address} />}
                        </>
                      )
                    })}
                    <Link onClick={() => setAddMemberModalIsOpen(true)} underline="none">
                      <ButtonLink text="Add a Member" icon={<AddSharp fontSize="small" />} />
                    </Link>
                  </>
                ) : (
                  <Button
                    fullWidth
                    color="secondary"
                    size="large"
                    variant="contained"
                    onClick={() => setAddMemberModalIsOpen(true)}
                    startIcon={<AddSharp />}
                  >
                    Add a Member
                  </Button>
                )}
              </Box>
              <Box className={classes.labelWrapper} sx={{ mt: 4 }}>
                <Typography variant="body1" className={classes.label}>
                  Targets
                </Typography>
                <Link href="#">
                  <Typography variant="body2" className={classes.labelLink}>
                    What's a target?
                  </Typography>
                </Link>
              </Box>
              <Box sx={{ mt: 1 }}>
                {role != null && role.targets.length > 0 ? (
                  <>
                    {role.targets.map((target, index) => {
                      return (
                        <>
                          <RoleTarget
                            key={target.id}
                            target={target}
                            onClickTarget={setActiveTarget}
                            activeTarget={!!(activeTarget && activeTarget.id === target.id)}
                            onRemoveTarget={handleRemoveTarget}
                          />
                          {index === 1 && <RemovedAddress address={target.address} />}
                        </>
                      )
                    })}
                    <Link onClick={() => setAddTargetModalIsOpen(true)} underline="none">
                      <ButtonLink text="Add a Target" icon={<AddSharp fontSize="small" />} />
                    </Link>
                  </>
                ) : (
                  <Button
                    fullWidth
                    color="secondary"
                    size="large"
                    variant="contained"
                    onClick={() => setAddTargetModalIsOpen(true)}
                    startIcon={<AddSharp />}
                  >
                    Add a Target
                  </Button>
                )}
              </Box>
            </Box>
            <Button
              fullWidth
              color="secondary"
              size="large"
              variant="contained"
              onClick={handleExecuteUpdate}
              disabled={isWaiting}
              startIcon={isWaiting ? <CircularProgress size={18} color="primary" /> : <AddSharp />}
            >
              {role && isWaiting
                ? "Updating role..."
                : role
                ? "Update role"
                : isWaiting
                ? "Creating role..."
                : "Create role"}
            </Button>
          </Box>
          {error != null && (
            <Typography color="error" className={classes.errorSpacing}>
              {error}
            </Typography>
          )}
        </Grid>
        <Grid item xs={8} lg={9}>
          <Box className={classes.item}>
            {!activeTarget ? (
              <Box className={classes.mainPanelZeroState}>
                <Box sx={{ display: "flex", alignItems: "center", flexDirection: "column" }}>
                  <Typography variant="body1" align="center">
                    You currently have no targets associated with this role.
                    <br />
                    Once you’ve added a target, you can configure the permissions here.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <RouterLink to="/">
                      <ButtonLink icon={<ArrowBackSharp fontSize="small" />} text="Go back to Roles" />
                    </RouterLink>
                  </Box>
                </Box>
              </Box>
            ) : (
              <TargetParameters
                target={activeTarget}
                onChangeTargetExecutionsOptions={handleChangeTargetExecutionOptions}
              />
            )}
          </Box>
        </Grid>
      </Grid>
      <AddAddressModal
        type="Member"
        isOpen={addMemberModalIsOpen}
        onAddAddress={handleAddMember}
        onClose={() => setAddMemberModalIsOpen(false)}
      />
      <AddAddressModal
        type="Target"
        isOpen={addTargetModalIsOpen}
        onAddAddress={handleAddTarget}
        onClose={() => setAddTargetModalIsOpen(false)}
      />
    </>
  )
}

export default RoleView
