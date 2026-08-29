export const BOOK_WEBSITE_URL = 'https://dawnofeverything.industries/'

export default function BookTitleLink() {
  return (
    <cite className="book-title">
      <a href={BOOK_WEBSITE_URL} target="_blank" rel="noopener noreferrer">
        The Dawn of Everything
      </a>
    </cite>
  )
}
