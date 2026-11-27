"use client";

export function HealthBar({
	current,
	label,
	max,
}: {
	current: number;
	label: string;
	max: number;
}) {
	const safeMax = max > 0 ? max : current;
	const ratio = safeMax > 0 ? Math.max(0, Math.min(1, current / safeMax)) : 0;

	return (
		<div>
			<div className="mb-1 flex justify-between text-sm">
				<span>{label}</span>
				<span className="text-muted-foreground">
					{current} / {safeMax}
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${ratio * 100}%` }}
				/>
			</div>
		</div>
	);
}
