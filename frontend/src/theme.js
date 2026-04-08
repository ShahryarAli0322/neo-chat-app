import { extendTheme } from "@chakra-ui/react";

const config = {
	colorMode: "dark",
	initialColorMode: "dark",
	useSystemColorMode: false,
};

const styles = {
	global: {
		"html, body, #root": {
			height: "100%",
			backgroundColor: "#0f0f1a",
		},
		body: {
			backgroundImage: "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)",
			backgroundAttachment: "fixed",
			color: "gray.100",
		},
	},
};

const colors = {
	brand: {
		500: "#7B61FF",
		600: "#FF4ECD",
	},
};

const components = {
	Button: {
		variants: {
			gradient: {
				bgGradient: "linear(to-r, brand.500, brand.600)",
				color: "white",
				boxShadow: "lg",
				transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
				_hover: {
					filter: "brightness(1.05)",
					transform: "translateY(-1px) scale(1.02)",
					boxShadow: "xl",
				},
				_active: {
					transform: "scale(0.98)",
					boxShadow: "md",
				},
			},
		},
	},
	Input: {
		defaultProps: {
			variant: "filled",
			focusBorderColor: "brand.500",
		},
		variants: {
			filled: {
				field: {
					background: "rgba(255,255,255,0.06)",
					_border: "none",
					_placeholder: { color: "gray.400" },
					_hover: { background: "rgba(255,255,255,0.08)" },
					_focus: {
						background: "rgba(255,255,255,0.08)",
						boxShadow: "0 0 0 2px rgba(123,97,255,0.6), 0 0 15px rgba(123,97,255,0.35)",
						borderColor: "transparent",
					},
				},
			},
		},
	},
};

const layerStyles = {
	glass: {
		background: "rgba(255, 255, 255, 0.06)",
		backdropFilter: "blur(10px)",
		border: "1px solid rgba(255, 255, 255, 0.12)",
		boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
		borderRadius: "lg",
	}
};

const theme = extendTheme({
	config,
	styles,
	colors,
	components,
	layerStyles,
});

export default theme;
