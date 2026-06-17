to_next_version() {
  echo "${1/-SNAPSHOT/}"
}

to_next_tag() {
  echo "next-${1%-SNAPSHOT}"
}
