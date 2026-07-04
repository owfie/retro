interface ChevronProps {
	direction: -1 | 1;
}

export function Chevron({ direction }: ChevronProps) {
	return (
		<svg
			aria-hidden="true"
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{direction === -1 ? (
				<path d="M7.5 2.5 4 6l3.5 3.5" />
			) : (
				<path d="M4.5 2.5 8 6 4.5 9.5" />
			)}
		</svg>
	);
}
