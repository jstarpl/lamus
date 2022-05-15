import { useEffect, useState } from "react"
import sorensen from '@sofie-automation/sorensen'

interface IProps {
	onSave: () => void
}

let sorensenInitialized = false

export const KeyboardHandler = ({onSave}: IProps) => {
	const [initialized, setInitialized ] = useState(false)

	useEffect(() => {
		if (!sorensenInitialized) {
			sorensen.init().then(() => setInitialized(true))
		} else {
			setInitialized(true)
		}

		return () => {

		}
	}, [])

	useEffect(() => {
		if (!initialized) return

		sorensen.bind('BrowserHome', (e) => {
			e.preventDefault()
			onSave()
		}, {
			global: true,
		})

		sorensen.bind('F2', (e) => {
			e.preventDefault()
			onSave()
		})

		return () => {
			sorensen.unbind('BrowserHome')
			sorensen.unbind('F2')
		}
	}, [initialized, onSave])

	return null
}