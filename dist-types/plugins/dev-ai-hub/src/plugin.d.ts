export declare const devAiHubPlugin: import("@backstage/frontend-plugin-api").OverridableFrontendPlugin<{
    root: import("@backstage/frontend-plugin-api").RouteRef<undefined>;
}, {}, {
    "api:dev-ai-hub": import("@backstage/frontend-plugin-api").OverridableExtensionDefinition<{
        kind: "api";
        name: undefined;
        config: {};
        configInput: {};
        output: import("@backstage/frontend-plugin-api").ExtensionDataRef<import("@backstage/frontend-plugin-api").AnyApiFactory, "core.api.factory", {}>;
        inputs: {};
        params: <TApi, TImpl extends TApi, TDeps extends { [name in string]: unknown; }>(params: import("@backstage/frontend-plugin-api").ApiFactory<TApi, TImpl, TDeps>) => import("@backstage/frontend-plugin-api").ExtensionBlueprintParams<import("@backstage/frontend-plugin-api").AnyApiFactory>;
    }>;
    "nav-item:dev-ai-hub": import("@backstage/frontend-plugin-api").OverridableExtensionDefinition<{
        kind: "nav-item";
        name: undefined;
        config: {};
        configInput: {};
        output: import("@backstage/frontend-plugin-api").ExtensionDataRef<{
            title: string;
            icon: import("@backstage/frontend-plugin-api").IconComponent;
            routeRef: import("@backstage/frontend-plugin-api").RouteRef<undefined>;
        }, "core.nav-item.target", {}>;
        inputs: {};
        params: {
            title: string;
            icon: import("@backstage/frontend-plugin-api").IconComponent;
            routeRef: import("@backstage/frontend-plugin-api").RouteRef<undefined>;
        };
    }>;
    "page:dev-ai-hub": import("@backstage/frontend-plugin-api").OverridableExtensionDefinition<{
        kind: "page";
        name: undefined;
        config: {
            path: string | undefined;
            title: string | undefined;
        };
        configInput: {
            title?: string | undefined;
            path?: string | undefined;
        };
        output: import("@backstage/frontend-plugin-api").ExtensionDataRef<string, "core.routing.path", {}> | import("@backstage/frontend-plugin-api").ExtensionDataRef<import("@backstage/frontend-plugin-api").RouteRef<import("@backstage/frontend-plugin-api").AnyRouteRefParams>, "core.routing.ref", {
            optional: true;
        }> | import("@backstage/frontend-plugin-api").ExtensionDataRef<import("react").JSX.Element, "core.reactElement", {}> | import("@backstage/frontend-plugin-api").ExtensionDataRef<string, "core.title", {
            optional: true;
        }> | import("@backstage/frontend-plugin-api").ExtensionDataRef<import("@backstage/frontend-plugin-api").IconElement, "core.icon", {
            optional: true;
        }>;
        inputs: {
            pages: import("@backstage/frontend-plugin-api").ExtensionInput<import("@backstage/frontend-plugin-api").ConfigurableExtensionDataRef<import("react").JSX.Element, "core.reactElement", {}> | import("@backstage/frontend-plugin-api").ConfigurableExtensionDataRef<string, "core.routing.path", {}> | import("@backstage/frontend-plugin-api").ConfigurableExtensionDataRef<import("@backstage/frontend-plugin-api").RouteRef<import("@backstage/frontend-plugin-api").AnyRouteRefParams>, "core.routing.ref", {
                optional: true;
            }> | import("@backstage/frontend-plugin-api").ConfigurableExtensionDataRef<string, "core.title", {
                optional: true;
            }> | import("@backstage/frontend-plugin-api").ConfigurableExtensionDataRef<import("@backstage/frontend-plugin-api").IconElement, "core.icon", {
                optional: true;
            }>, {
                singleton: false;
                optional: false;
                internal: false;
            }>;
        };
        params: {
            defaultPath?: [Error: `Use the 'path' param instead`];
            path: string;
            title?: string;
            icon?: import("@backstage/frontend-plugin-api").IconElement;
            loader?: () => Promise<import("react").JSX.Element>;
            routeRef?: import("@backstage/frontend-plugin-api").RouteRef;
            noHeader?: boolean;
        };
    }>;
}>;
