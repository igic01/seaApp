import { useRef, useState } from 'react'
import Sidebar from './elements/Sidebar.jsx'
import Canvas from './elements/Canvas.jsx'

function App() {
  const openFileRef = useRef(null)
  const cropActionsRef = useRef(null)
  const [isCropping, setIsCropping] = useState(false)

  const handleRegisterOpenFile = (fn) => {
    openFileRef.current = fn
  }

  const handleRegisterCropActions = (actions) => {
    cropActionsRef.current = actions
  }

  const handleOpenFolder = () => {
    openFileRef.current?.()
  }

  const handleToggleCrop = () => {
    cropActionsRef.current?.toggle?.()
  }

  return (
    <>
      <Canvas
        onRegisterOpenFile={handleRegisterOpenFile}
        onRegisterCropActions={handleRegisterCropActions}
        onCropModeChange={setIsCropping}
      />
      <Sidebar
        onOpenFolder={handleOpenFolder}
        onToggleCrop={handleToggleCrop}
        isCropping={isCropping}
      />
    </>
  )
}

export default App
