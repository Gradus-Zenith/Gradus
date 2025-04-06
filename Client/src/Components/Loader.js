import '../Styles/loaderStyles.css'

function Loader({text}) {
    return (
      <div className='flex flex-col items-center justify-center'>
        
      <div className="loader">
        <div className="cell d-0"></div>
        <div className="cell d-1"></div>
        <div className="cell d-2"></div>
  
        <div className="cell d-1"></div>
        <div className="cell d-2"></div>
  
        <div className="cell d-2"></div>
        <div className="cell d-3"></div>
  
        <div className="cell d-3"></div>
        <div className="cell d-4"></div>
      </div>
      <h1 className='text-white text-lg font-semibold mt-3'>{text}</h1>
      </div>
    );
  }
  
  export default Loader;