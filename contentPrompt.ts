import { PROMPT_INPUT_KEY } from "./contants"

const icon = `<svg t="1703927965243" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1465" width="24" height="24"><path d="M970.105263 404.210526H53.894737v-323.368421h916.210526v323.368421z m-862.315789-53.894737h808.421052v-215.578947H107.789474v215.578947z" fill="#000000" p-id="1466"></path><path d="M970.105263 943.157895H53.894737v-592.842106h916.210526v592.842106z m-862.315789-53.894737h808.421052v-485.052632H107.789474v485.052632zM754.526316 307.2L662.905263 215.578947l37.726316-37.726315 53.894737 53.894736 53.894737-53.894736 37.726315 37.726315z" fill="#000000" p-id="1467"></path><path d="M264.084211 781.473684h485.052631v-53.894737h-485.052631v53.894737z m0-107.789473h485.052631v-53.894737h-485.052631v53.894737z m0-161.684211v53.894737h485.052631v-53.894737h-485.052631z" fill="#000000" p-id="1468"></path></svg>`
export const stickyPromptIconToInput = () => {
  const iconWrap = document.createElement("div")
  iconWrap.innerHTML = icon
  iconWrap.className = "BearGpt-prompt-iconWrap"
  const input = document.querySelector(`#${PROMPT_INPUT_KEY}`) as HTMLElement
  console.log(
    getComputedStyle(input, null).getPropertyValue("padding-right"),
    44444
  )
  input.style.paddingRight =
    getComputedStyle(input, null).getPropertyValue("paddingRight") + 100
  document
    .querySelector(`#${PROMPT_INPUT_KEY}`)
    .parentNode.appendChild(iconWrap)
}
