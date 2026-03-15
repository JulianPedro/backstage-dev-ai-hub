import { SvgIconProps } from '@mui/material/SvgIcon';
import type { AiTool } from '@internal/plugin-dev-ai-hub-common';
interface ToolIconProps extends Omit<SvgIconProps, 'color'> {
    tool: AiTool;
    /** Use the brand's official color. Defaults to true. */
    branded?: boolean;
}
export declare function ToolIcon({ tool, branded, sx, ...props }: ToolIconProps): import("react/jsx-runtime").JSX.Element | null;
export {};
