import {
	chakra,
	ImageProps,
	forwardRef,
	usePrefersReducedMotion,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import chakraLogo from '../assets/chakra.svg'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export const Logo = forwardRef<ImageProps, 'img'>((props, ref) => {
	const prefersReducedMotion = usePrefersReducedMotion()

	const animation = prefersReducedMotion
		? undefined
		: `${spin} infinite 20s linear`

	return (
		<chakra.img
			animation={animation}
			src={chakraLogo}
			ref={ref}
			{...props}
		/>
	)
})
