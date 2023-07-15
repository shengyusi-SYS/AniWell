import { useMediaQuery } from "@vueuse/core"
import { computed } from "vue"
const minWidthCheck = useMediaQuery("(min-width: 426px)")
const minHeightCheck = useMediaQuery("(min-height: 426px)")
export default computed(() => minWidthCheck.value && minHeightCheck.value)
