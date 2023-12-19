// 将HTML转义为实体
export const escape = (html: string) => {
  let temp = document.createElement("div")
  temp.textContent != null ? (temp.textContent = html) : (temp.innerText = html)
  const output = temp.innerHTML
  temp = null
  return output
}
