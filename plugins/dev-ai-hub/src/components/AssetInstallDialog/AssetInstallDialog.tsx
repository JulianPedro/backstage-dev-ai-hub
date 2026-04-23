import {useEffect, useRef, useState} from "react";
import Box from "@mui/material/Box";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grow from "@mui/material/Grow";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import CheckIcon from "@mui/icons-material/Check";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import type {AiTool, AssetType} from "@julianpedro/plugin-dev-ai-hub-common";
import {getInstallPathsForAsset} from "@julianpedro/plugin-dev-ai-hub-common";
import {useApi} from "@backstage/core-plugin-api";
import {devAiHubApiRef} from "../../api/DevAiHubClient";
import {useAssetDetail} from "../../hooks";
import {ToolIcon} from "../ToolIcon";

const TOOL_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  "github-copilot": "GitHub Copilot",
  "google-gemini": "Google Gemini",
  cursor: "Cursor",
};

/**
 * Maps asset type to the VS Code URI protocol handler path.
 *
 * VS Code's built-in PromptUrlHandler only registers these paths:
 *   - `chat-instructions/install`  → .instructions.md
 *   - `chat-prompt/install`        → .prompt.md
 *   - `chat-mode/install` (alias: `chat-agent/install`) → .chatmode.md
 *
 * Source:
 * https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/promptSyntax/promptUrlHandler.ts
 *
 * `skill` and `workflow` have no native VS Code handler — for those we
 * return `null` and the "Add to VS Code" button is hidden.
 */
const VSCODE_INSTALL_SCHEMES: Record<AssetType, string | null> = {
  instruction: "chat-instructions",
  agent: "chat-mode",
  skill: null,
  workflow: "chat-prompt",
};

function buildVSCodeInstallUri(
  type: AssetType,
  rawUrl: string,
  protocol: "vscode" | "vscode-insiders" = "vscode",
): string | null {
  const scheme = VSCODE_INSTALL_SCHEMES[type];
  if (!scheme) return null;
  // VS Code only accepts http(s) raw URLs in its handler.
  return `${protocol}:${scheme}/install?url=${encodeURIComponent(rawUrl)}`;
}

interface AssetInstallDialogProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetInstallDialog({
  assetId,
  onClose,
}: AssetInstallDialogProps) {
  const [copiedTool, setCopiedTool] = useState<string | null>(null);
  const [vsCodeMenuOpen, setVsCodeMenuOpen] = useState(false);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const vsCodeAnchorRef = useRef<HTMLDivElement>(null);
  const api = useApi(devAiHubApiRef);
  const {asset, loading} = useAssetDetail(assetId);

  // Pre-fetch the raw URL synchronously as soon as the asset is known so the
  // "Add to VS Code" click handler can run without any `await`. Custom
  // protocol navigations (vscode:) are blocked by browsers when the user
  // gesture has been lost across an `await`.
  useEffect(() => {
    if (!asset) {
      setRawUrl(null);
      return () => {};
    }
    let cancelled = false;
    api.getDownloadUrl(asset.id).then((downloadUrl) => {
      if (cancelled) return;
      // Ensure the URL is absolute — VS Code only accepts http/https.
      const absolute = downloadUrl.startsWith("http")
        ? downloadUrl
        : new URL(downloadUrl, window.location.origin).toString();
      setRawUrl(absolute.replace(/\/download$/, "/raw"));
    });
    return () => {
      cancelled = true;
    };
  }, [asset, api]);

  const handleClose = () => {
    onClose();
    setCopiedTool(null);
    setVsCodeMenuOpen(false);
  };

  const handleCopy = (tool: string) => {
    if (!asset) return;
    navigator.clipboard.writeText(asset.content).then(() => {
      setCopiedTool(tool);
      setTimeout(() => setCopiedTool(null), 2000);
    });
    api.trackInstall(asset.id).catch(() => {});
  };

  const handleAddToVSCode = (
    protocol: "vscode" | "vscode-insiders" = "vscode",
  ) => {
    if (!asset || !rawUrl) return;
    setVsCodeMenuOpen(false);
    const vscodeUri = buildVSCodeInstallUri(asset.type, rawUrl, protocol);
    if (!vscodeUri) return;
    // Log for easy debugging: paste this URL in your address bar to test.
    // eslint-disable-next-line no-console
    console.info("[dev-ai-hub] Opening VS Code URI:", vscodeUri);
    // Use a real <a> element attached to the DOM and trigger a synchronous
    // click inside the user-gesture tick. This is the most reliable way to
    // launch a custom protocol handler — `window.location.href` is often
    // silently blocked for non-standard schemes.
    const a = document.createElement("a");
    a.href = vscodeUri;
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    api.trackInstall(asset.id).catch(() => {});
  };

  const canAddToVSCode = asset
    ? VSCODE_INSTALL_SCHEMES[asset.type] !== null && !!rawUrl
    : false;

  const resourcePaths = asset?.resourcesContent
    ? Object.keys(asset.resourcesContent)
    : [];
  const isZipSkill = asset?.type === "skill" && resourcePaths.length > 0;

  const handleDownload = async (_tool: string, installPath: string) => {
    if (!asset) return;
    if (isZipSkill) {
      const url = await api.getDownloadUrl(asset.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${asset.name.replace(/\s+/g, "-").toLowerCase()}.zip`;
      a.click();
    } else {
      const filename = installPath.split("/").pop() ?? `${asset.name}.md`;
      const blob = new Blob([asset.content], {type: "text/markdown"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    api.trackInstall(asset.id).catch(() => {});
  };

  const installPaths = asset
    ? getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      })
    : {};

  return (
    <Dialog open={!!assetId} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{pb: 1}}>
        {asset ? `Install: ${asset.label ?? asset.name}` : "Install"}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{mt: 0.5, fontWeight: 400}}
        >
          Add directly to VS Code or copy the content for your tool.
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          pt: "8px !important",
        }}
      >
        {loading && (
          <Box sx={{display: "flex", justifyContent: "center", py: 3}}>
            <CircularProgress />
          </Box>
        )}

        {!loading && asset && isZipSkill && (
          <Box
            sx={{
              border: "1px solid",
              borderColor: "info.main",
              borderRadius: 2,
              p: 1.5,
              backgroundColor: "info.main",
              backgroundImage: "none",
              bgcolor: (theme) => `${theme.palette.info.main}12`,
            }}
          >
            <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
              <FolderZipIcon sx={{fontSize: "1rem", color: "info.main"}} />
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="info.main"
              >
                Bundled skill — downloads as .zip
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{display: "block", mb: 1}}
            >
              This skill includes resource files alongside <code>SKILL.md</code>
              . Extract the zip and place all files in the skill directory.
            </Typography>
            <Box sx={{display: "flex", gap: 0.5, flexWrap: "wrap"}}>
              <Chip
                label="SKILL.md"
                size="small"
                sx={{fontFamily: "monospace", fontSize: "0.7rem", height: 20}}
              />
              {resourcePaths.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  size="small"
                  variant="outlined"
                  sx={{fontFamily: "monospace", fontSize: "0.7rem", height: 20}}
                />
              ))}
            </Box>
          </Box>
        )}

        {!loading &&
          asset &&
          Object.entries(installPaths).map(([tool, installPath]) => (
            <Box
              key={tool}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
                <ToolIcon tool={tool as AiTool} sx={{fontSize: "1rem"}} />
                <Typography variant="subtitle2" fontWeight={700}>
                  {TOOL_LABELS[tool] ?? tool}
                </Typography>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{display: "block", mb: 0.5}}
              >
                Install path
              </Typography>
              <Box
                sx={{
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.75,
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                  color: "text.primary",
                  wordBreak: "break-all",
                  mb: 1.25,
                }}
              >
                {installPath}
              </Box>

              <Box sx={{display: "flex", gap: 1, flexWrap: "nowrap"}}>
                {tool === "github-copilot" && !isZipSkill && canAddToVSCode && (
                  <ButtonGroup
                    variant="contained"
                    size="small"
                    ref={vsCodeAnchorRef}
                    sx={{minWidth: 0}}
                  >
                    <Button
                      startIcon={
                        <img
                          src="https://code.visualstudio.com/favicon.ico"
                          alt=""
                          width={14}
                          height={14}
                        />
                      }
                      onClick={() => handleAddToVSCode("vscode")}
                      sx={{minWidth: 0, whiteSpace: "nowrap", px: 1.5}}
                    >
                      Add to VS Code
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setVsCodeMenuOpen((prev) => !prev)}
                      sx={{px: 0.25, minWidth: "auto"}}
                    >
                      <ArrowDropDownIcon fontSize="small" />
                    </Button>
                  </ButtonGroup>
                )}
                {tool === "github-copilot" && !isZipSkill && canAddToVSCode && (
                  <Popper
                    open={vsCodeMenuOpen}
                    anchorEl={vsCodeAnchorRef.current}
                    transition
                    disablePortal
                    placement="bottom-start"
                    sx={{zIndex: 1301}}
                  >
                    {({TransitionProps}) => (
                      <Grow {...TransitionProps}>
                        <Paper elevation={4}>
                          <ClickAwayListener
                            onClickAway={() => setVsCodeMenuOpen(false)}
                          >
                            <MenuList dense>
                              <MenuItem
                                onClick={() => handleAddToVSCode("vscode")}
                              >
                                Add to VS Code
                              </MenuItem>
                              <MenuItem
                                onClick={() =>
                                  handleAddToVSCode("vscode-insiders")
                                }
                              >
                                Add to VS Code Insiders
                              </MenuItem>
                            </MenuList>
                          </ClickAwayListener>
                        </Paper>
                      </Grow>
                    )}
                  </Popper>
                )}
                <Tooltip
                  title={
                    copiedTool === tool ? "Copied!" : "Copy markdown content"
                  }
                >
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      copiedTool === tool ? <CheckIcon /> : <ContentCopyIcon />
                    }
                    onClick={() => handleCopy(tool)}
                    color={copiedTool === tool ? "success" : "primary"}
                    sx={{minWidth: 0, whiteSpace: "nowrap"}}
                  >
                    {copiedTool === tool ? "Copied!" : "Copy Content"}
                  </Button>
                </Tooltip>
                <Tooltip
                  title={
                    isZipSkill
                      ? "Download as .zip with all bundled files"
                      : "Download file with correct name"
                  }
                >
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      isZipSkill ? <FolderZipIcon /> : <DownloadIcon />
                    }
                    onClick={() => handleDownload(tool, installPath)}
                    sx={{minWidth: 0, whiteSpace: "nowrap"}}
                  >
                    {isZipSkill ? "Download .zip" : "Download"}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
