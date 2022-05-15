import { useEffect } from "react";

export function MouseHandler() {
	useEffect(() => {
		function wheelZoomSink(e: WheelEvent) {
			if (e.ctrlKey) {
				e.preventDefault()
			}
		}

		document.addEventListener('wheel', wheelZoomSink, {
			passive: false,
		})

		return () => {
			document.removeEventListener('wheel', wheelZoomSink)
		}
	})

	return null
}